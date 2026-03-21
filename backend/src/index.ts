import "dotenv/config";
import crypto from "crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Prisma, PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("A variavel JWT_SECRET e obrigatoria em producao.");
}

const IS_PROD = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-alterar-em-producao";
const ACCESS_TOKEN_TTL_MINUTES = Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
const ACTIVATION_TOKEN_TTL_MINUTES = Number(process.env.ACTIVATION_TOKEN_TTL_MINUTES ?? 30);
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30);
const INVITATION_TOKEN_TTL_MINUTES = Number(process.env.INVITATION_TOKEN_TTL_MINUTES ?? 60 * 24); // 24h
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

// Admin "protegido" (não pode ser excluído)
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL ?? "ioiobsant@gmail.com");

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

const ACCESS_COOKIE_NAME = "gba_access";
const REFRESH_COOKIE_NAME = "gba_refresh";
const CSRF_COOKIE_NAME = "gba_csrf";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origem CORS nao permitida."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

type OrderCustomer = {
  name: string;
  whatsapp: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type OrderSpecs = {
  hasPainting: boolean;
  paintColor?: string;
  paintFinish?: string;
  fabric?: string;
  foam?: string;
  base?: string;
  manufactureType: "Fabricação própria" | "Reforma";
};

interface OrderBody {
  id?: string;
  category?: string;
  model?: string;
  productImageUrl?: string;
  size?: string;
  customer?: OrderCustomer;
  specs?: OrderSpecs;
  quantity?: number;
  saleValue?: number;
  deliveryDate?: string;
  status?: string;
  createdAt?: string;
  notes?: string;
}

interface AuthenticatedRequest extends Request {
  auth?: { adminId: string };
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type OrderWithCustomerRecord = {
  id: string;
  category: string;
  model: string;
  productImageUrl: string | null;
  size: string | null;
  specs: unknown;
  quantity: number;
  saleValue: number;
  deliveryDate: string;
  status: string;
  createdAt: string;
  notes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };
};

type AuthCookies = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

type AdminPublic = {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

function splitName(name: string): { firstName: string; lastName: string } {
  const safeName = (name || "").trim().replace(/\s+/g, " ");
  if (!safeName) {
    return { firstName: "Cliente", lastName: "Sem sobrenome" };
  }
  const [firstName, ...rest] = safeName.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "Sem sobrenome",
  };
}

function joinName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
}

function parseCookies(req: Request): Record<string, string> {
  const source = req.headers.cookie ?? "";
  if (!source) return {};

  const parsed: Record<string, string> = {};
  for (const chunk of source.split(";")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    parsed[key] = decodeURIComponent(value);
  }

  return parsed;
}

function getCookie(req: Request, name: string): string | null {
  return parseCookies(req)[name] ?? null;
}

function getHeaderValue(req: Request, headerName: string): string {
  const value = req.headers[headerName.toLowerCase() as keyof Request["headers"]];
  if (Array.isArray(value)) return value[0] ?? "";
  if (typeof value === "string") return value;
  return "";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken(size = 48): string {
  return crypto.randomBytes(size).toString("base64url");
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildResetPasswordLink(token: string): string {
  const baseUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  return `${baseUrl}/login?reset=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetLink = buildResetPasswordLink(token);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Auth] Token de redefinição para ${to}: ${token}`);
    console.log(`[Auth] Link: ${resetLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: "Redefinição de senha — Genice Brandão Atelier",
    text: `Olá!\n\nUse o código abaixo para redefinir sua senha (válido por ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutos):\n\n${token}\n\nOu acesse o link:\n${resetLink}\n\nSe você não solicitou essa alteração, ignore este e-mail.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#b06a3a">Genice Brandão Atelier</h2>
        <p>Olá! Para redefinir sua senha, use o código abaixo:</p>
        <div style="background:#f5f0eb;padding:16px 24px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#3d1f0a">
          ${token}
        </div>
        <p style="margin-top:16px">Ou clique no botão:</p>
        <a href="${resetLink}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#b06a3a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Redefinir senha
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Este código expira em ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutos.<br>
          Se você não solicitou essa alteração, ignore este e-mail.
        </p>
      </div>
    `,
  });
}

function buildInviteLink(token: string): string {
  const baseUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  return `${baseUrl}/convite?token=${encodeURIComponent(token)}`;
}

async function sendInvitationEmail(to: string, token: string): Promise<void> {
  const inviteLink = buildInviteLink(token);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Auth] Token de convite para ${to}: ${token}`);
    console.log(`[Auth] Link: ${inviteLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const ttlHours = Math.round(INVITATION_TOKEN_TTL_MINUTES / 60);
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: "Convite para acesso — Genice Brandão Atelier",
    text: `Olá!\n\nVocê foi convidado a acessar o painel. Use o código abaixo para cadastrar sua senha (válido por ${ttlHours}h):\n\n${token}\n\nOu acesse o link:\n${inviteLink}\n\nSe você não esperava este convite, ignore este e-mail.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#b06a3a">Genice Brandão Atelier</h2>
        <p>Você foi convidado a acessar o painel. Use o código abaixo para cadastrar sua senha:</p>
        <div style="background:#f5f0eb;padding:16px 24px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#3d1f0a">
          ${token}
        </div>
        <p style="margin-top:16px">Ou clique no botão:</p>
        <a href="${inviteLink}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#b06a3a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Cadastrar minha senha
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Este convite expira em ${ttlHours} horas.<br>
          Se você não esperava este convite, ignore este e-mail.
        </p>
      </div>
    `,
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getClientIp(req: Request): string | null {
  const forwarded = getHeaderValue(req, "x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    return first?.trim() || null;
  }
  const direct = req.socket.remoteAddress;
  return direct ?? null;
}

function createAccessToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, JWT_SECRET, {
    expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Token JWT invalido.");
  }
  return payload.sub;
}

function getRefreshExpiryIso(): string {
  return addDays(new Date(), REFRESH_TOKEN_TTL_DAYS).toISOString();
}

function mapAdminToPublic(admin: AdminPublic): AdminPublic {
  return {
    id: admin.id,
    email: admin.email,
    phone: admin.phone,
    createdAt: admin.createdAt,
  };
}

function setAuthCookies(res: Response, payload: AuthCookies) {
  const common = {
    secure: IS_PROD,
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookie(ACCESS_COOKIE_NAME, payload.accessToken, {
    ...common,
    httpOnly: true,
    maxAge: ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });

  res.cookie(REFRESH_COOKIE_NAME, payload.refreshToken, {
    ...common,
    httpOnly: true,
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  res.cookie(CSRF_COOKIE_NAME, payload.csrfToken, {
    ...common,
    httpOnly: false,
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  const common = {
    secure: IS_PROD,
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie(ACCESS_COOKIE_NAME, common);
  res.clearCookie(REFRESH_COOKIE_NAME, common);
  res.clearCookie(CSRF_COOKIE_NAME, common);
}

function readCsrfPair(req: Request): { cookieToken: string; headerToken: string } {
  const cookieToken = getCookie(req, CSRF_COOKIE_NAME) ?? "";
  const headerToken = getHeaderValue(req, "x-csrf-token").trim();
  return { cookieToken, headerToken };
}

function validateCsrfPair(req: Request) {
  const { cookieToken, headerToken } = readCsrfPair(req);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new HttpError(403, "Falha de validacao do CSRF token.");
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const accessFromCookie = getCookie(req, ACCESS_COOKIE_NAME);
  const accessFromHeader = extractBearerToken(req.headers.authorization);
  const token = accessFromCookie ?? accessFromHeader;

  if (!token) {
    return res.status(401).json({ error: "Nao autenticado." });
  }

  try {
    const adminId = verifyAccessToken(token);
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { isActive: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "Sessao invalida." });
    }

    (req as AuthenticatedRequest).auth = { adminId };
    return next();
  } catch {
    return res.status(401).json({ error: "Token de acesso invalido ou expirado." });
  }
}

function requireCsrfForWrites(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  try {
    validateCsrfPair(req);
    return next();
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(403).json({ error: "Falha de validacao do CSRF token." });
  }
}

function mapOrderRecordToResponse(record: OrderWithCustomerRecord) {
  return {
    id: record.id,
    category: record.category,
    model: record.model,
    productImageUrl: record.productImageUrl ?? undefined,
    size: record.size ?? undefined,
    customer: {
      name: joinName(record.customer.firstName, record.customer.lastName),
      firstName: record.customer.firstName,
      lastName: record.customer.lastName,
      whatsapp: record.customer.phone,
      email: record.customer.email ?? "",
    },
    specs: record.specs as OrderSpecs,
    quantity: record.quantity,
    saleValue: record.saleValue,
    deliveryDate: record.deliveryDate,
    status: record.status,
    createdAt: record.createdAt,
    notes: record.notes ?? undefined,
  };
}

function getCustomerNameParts(customer: OrderCustomer): {
  firstName: string;
  lastName: string;
} {
  const firstName = (customer.firstName ?? "").trim();
  const lastName = (customer.lastName ?? "").trim();

  if (firstName || lastName) {
    return {
      firstName: firstName || "Cliente",
      lastName: lastName || "Sem sobrenome",
    };
  }

  return splitName(customer.name);
}

async function resolveCustomer(customer: OrderCustomer) {
  const email = normalizeEmail(customer.email);
  const phone = normalizePhone(customer.whatsapp);

  if (!email && !phone) {
    throw new HttpError(400, "Informe email ou celular do cliente.");
  }

  const identifiers: Prisma.CustomerWhereInput[] = [];
  if (email) identifiers.push({ email });
  if (phone) identifiers.push({ phone });

  const matches = await prisma.customer.findMany({
    where: { OR: identifiers },
    take: 2,
  });

  if (matches.length > 1) {
    throw new HttpError(
      409,
      "Conflito de cadastro: email e celular pertencem a clientes diferentes."
    );
  }

  const now = nowIso();
  const { firstName, lastName } = getCustomerNameParts(customer);
  const existing = matches[0];

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        email: email || existing.email,
        phone: phone || existing.phone,
        updatedAt: now,
      },
    });
  }

  if (!phone) {
    throw new HttpError(
      400,
      "Celular e obrigatorio para cadastrar um novo cliente."
    );
  }

  return prisma.customer.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone,
      createdAt: now,
      updatedAt: now,
    },
  });
}

function handleError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Conflito de dados unicos." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Registro nao encontrado." });
    }
  }

  console.error(error);
  return res.status(500).json({ error: fallbackMessage });
}

app.use("/orders", requireAuth, requireCsrfForWrites);
app.use("/customers", requireAuth, requireCsrfForWrites);

app.get("/customers/lookup", async (req, res) => {
  try {
    const email = normalizeEmail(String(req.query.email ?? ""));
    const phone = normalizePhone(String(req.query.phone ?? ""));

    if (!email && !phone) {
      throw new HttpError(400, "Informe email ou celular para busca.");
    }

    const identifiers: Prisma.CustomerWhereInput[] = [];
    if (email) identifiers.push({ email });
    if (phone) identifiers.push({ phone });

    const matches = await prisma.customer.findMany({
      where: { OR: identifiers },
      take: 2,
    });

    if (matches.length > 1) {
      throw new HttpError(
        409,
        "Conflito de cadastro: email e celular pertencem a clientes diferentes."
      );
    }

    const customer = matches[0];
    if (!customer) {
      return res.json({ found: false });
    }

    return res.json({
      found: true,
      customer: {
        id: customer.id,
        name: joinName(customer.firstName, customer.lastName),
        firstName: customer.firstName,
        lastName: customer.lastName,
        whatsapp: customer.phone,
        email: customer.email ?? "",
      },
    });
  } catch (error) {
    return handleError(res, error, "Erro ao buscar cliente.");
  }
});

app.get("/orders", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders.map((order) => mapOrderRecordToResponse(order)));
  } catch (error) {
    return handleError(res, error, "Erro ao listar pedidos.");
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true },
    });

    if (!order) {
      throw new HttpError(404, "Pedido nao encontrado.");
    }

    return res.json(mapOrderRecordToResponse(order));
  } catch (error) {
    return handleError(res, error, "Erro ao buscar pedido.");
  }
});

app.post("/orders", async (req, res) => {
  try {
    const body = req.body as OrderBody;

    if (
      !body.id ||
      !body.category ||
      !body.model ||
      !body.customer ||
      !body.specs ||
      body.quantity == null ||
      body.saleValue == null ||
      !body.deliveryDate ||
      !body.status ||
      !body.createdAt
    ) {
      throw new HttpError(
        400,
        "Campos obrigatorios: id, category, model, customer, specs, quantity, saleValue, deliveryDate, status, createdAt"
      );
    }

    const existing = await prisma.order.findUnique({ where: { id: body.id } });
    if (existing) {
      throw new HttpError(409, "Ja existe um pedido com esse ID.");
    }

    const customer = await resolveCustomer(body.customer);

    const order = await prisma.order.create({
      data: {
        id: body.id,
        category: body.category,
        model: body.model,
        productImageUrl: body.productImageUrl ?? null,
        size: body.size ?? null,
        customerId: customer.id,
        specs: body.specs as unknown as Prisma.InputJsonValue,
        quantity: body.quantity,
        saleValue: body.saleValue,
        deliveryDate: body.deliveryDate,
        status: body.status,
        createdAt: body.createdAt,
        notes: body.notes ?? null,
      },
      include: { customer: true },
    });

    return res.status(201).json(mapOrderRecordToResponse(order));
  } catch (error) {
    return handleError(res, error, "Erro ao criar pedido.");
  }
});

app.put("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body as OrderBody;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing) {
      throw new HttpError(404, "Pedido nao encontrado.");
    }

    if (body.id && body.id !== id) {
      const idInUse = await prisma.order.findUnique({ where: { id: body.id } });
      if (idInUse) {
        throw new HttpError(409, "Ja existe um pedido com esse ID.");
      }
    }

    const data: Prisma.OrderUpdateInput = {
      ...(body.id != null && { id: body.id }),
      ...(body.category != null && { category: body.category }),
      ...(body.model != null && { model: body.model }),
      ...(body.productImageUrl !== undefined && {
        productImageUrl: body.productImageUrl ?? null,
      }),
      ...(body.size !== undefined && { size: body.size ?? null }),
      ...(body.specs != null && {
        specs: body.specs as unknown as Prisma.InputJsonValue,
      }),
      ...(body.quantity != null && { quantity: body.quantity }),
      ...(body.saleValue != null && { saleValue: body.saleValue }),
      ...(body.deliveryDate != null && { deliveryDate: body.deliveryDate }),
      ...(body.status != null && { status: body.status }),
      ...(body.createdAt != null && { createdAt: body.createdAt }),
      ...(body.notes !== undefined && { notes: body.notes ?? null }),
    };

    if (body.customer) {
      const customer = await resolveCustomer(body.customer);
      data.customer = { connect: { id: customer.id } };
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { customer: true },
    });

    return res.json(mapOrderRecordToResponse(order));
  } catch (error) {
    return handleError(res, error, "Erro ao atualizar pedido.");
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, "Pedido nao encontrado.");
    }

    await prisma.order.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Erro ao remover pedido.");
  }
});

app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email: rawEmail } = req.body as { email?: string };
    const emailNorm = normalizeEmail(rawEmail ?? "");

    if (!emailNorm) {
      return res.status(400).json({ error: "Informe o email cadastrado." });
    }

    const admin = await prisma.admin.findFirst({
      where: { email: emailNorm, isActive: true },
      select: { id: true },
    });

    if (!admin) {
      return res.json({ ok: true });
    }

    const now = nowIso();
    await prisma.passwordResetToken.deleteMany({ where: { adminId: admin.id } });

    const token = generateOpaqueToken(32);
    const tokenHash = hashToken(token);

    await prisma.passwordResetToken.create({
      data: {
        adminId: admin.id,
        tokenHash,
        createdAt: now,
        expiresAt: addMinutes(new Date(), PASSWORD_RESET_TOKEN_TTL_MINUTES).toISOString(),
      },
    });

    await sendPasswordResetEmail(emailNorm, token);

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao solicitar redefinicao de senha.");
  }
});

app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    const rawToken = (token ?? "").trim();

    if (!rawToken) {
      throw new HttpError(400, "Token de redefinicao obrigatorio.");
    }

    if (!newPassword || newPassword.length < 8) {
      throw new HttpError(400, "A nova senha deve ter no minimo 8 caracteres.");
    }

    const tokenHash = hashToken(rawToken);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!resetRecord) {
      throw new HttpError(400, "Token invalido ou expirado.");
    }

    if (new Date(resetRecord.expiresAt) < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      throw new HttpError(400, "Token expirado.");
    }

    const now = nowIso();
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: resetRecord.adminId },
        data: { passwordHash, updatedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({ where: { adminId: resetRecord.adminId } }),
    ]);

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao redefinir senha.");
  }
});

app.get("/auth/admins", requireAuth, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      where: { isActive: true },
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json({
      admins: admins.map((a) => ({ id: a.id, email: a.email ?? "", createdAt: a.createdAt })),
    });
  } catch (error) {
    return handleError(res, error, "Erro ao listar admins.");
  }
});

app.delete("/auth/admins/:id", requireAuth, requireCsrfForWrites, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = (req as AuthenticatedRequest).auth?.adminId;
    const protectedEmail = ADMIN_EMAIL;

    if (!targetId) {
      throw new HttpError(400, "ID do admin invalido.");
    }

    const target = await prisma.admin.findUnique({
      where: { id: targetId },
      select: { id: true, isActive: true, email: true },
    });

    if (!target) {
      throw new HttpError(404, "Admin nao encontrado.");
    }

    if (target.email && normalizeEmail(target.email) === protectedEmail) {
      throw new HttpError(409, "Esta conta nao pode ser excluida.");
    }

    if (target.isActive) {
      const activeCount = await prisma.admin.count({ where: { isActive: true } });
      if (activeCount <= 1) {
        throw new HttpError(409, "Nao e possivel excluir o ultimo admin ativo.");
      }
    }

    await prisma.admin.delete({ where: { id: targetId } });

    if (targetId === currentId) {
      clearAuthCookies(res);
    }

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao excluir admin.");
  }
});

app.post("/auth/invite-admin", requireAuth, async (req, res) => {
  try {
    const adminId = (req as AuthenticatedRequest).auth?.adminId;
    if (!adminId) throw new HttpError(401, "Nao autenticado.");

    // Apenas o admin master (ADMIN_EMAIL) pode convidar novos admins.
    const inviter = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { email: true, isActive: true },
    });
    if (!inviter || !inviter.isActive) {
      throw new HttpError(401, "Nao autenticado.");
    }
    const inviterEmail = normalizeEmail(inviter.email ?? "");
    if (inviterEmail !== ADMIN_EMAIL) {
      throw new HttpError(403, "Apenas o admin master pode cadastrar novos admins.");
    }

    const { email: rawEmail } = req.body as { email?: string };
    const emailNorm = normalizeEmail(rawEmail ?? "");

    if (!emailNorm) {
      throw new HttpError(400, "Informe um email valido.");
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: { email: emailNorm },
    });
    if (existingAdmin) {
      throw new HttpError(409, "Ja existe um admin com esse email.");
    }

    const existingInvite = await prisma.invitationToken.findFirst({
      where: { invitedEmail: emailNorm },
    });
    if (existingInvite && new Date(existingInvite.expiresAt) > new Date()) {
      throw new HttpError(409, "Ja existe um convite pendente para esse email.");
    }

    if (existingInvite) {
      await prisma.invitationToken.deleteMany({ where: { invitedEmail: emailNorm } });
    }

    const now = nowIso();
    const token = generateOpaqueToken(32);
    const tokenHash = hashToken(token);

    await prisma.invitationToken.create({
      data: {
        invitedEmail: emailNorm,
        tokenHash,
        invitedByAdminId: adminId,
        createdAt: now,
        expiresAt: addMinutes(new Date(), INVITATION_TOKEN_TTL_MINUTES).toISOString(),
      },
    });

    await sendInvitationEmail(emailNorm, token);

    return res.status(201).json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao enviar convite.");
  }
});

app.post("/auth/accept-invite", async (req, res) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    const rawToken = (token ?? "").trim();

    if (!rawToken) {
      throw new HttpError(400, "Token de convite obrigatorio.");
    }

    if (!newPassword || newPassword.length < 8) {
      throw new HttpError(400, "A senha deve ter no minimo 8 caracteres.");
    }

    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.invitationToken.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new HttpError(400, "Token invalido ou expirado.");
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.invitationToken.delete({ where: { id: invitation.id } });
      throw new HttpError(400, "Convite expirado.");
    }

    const emailNorm = invitation.invitedEmail;
    const existingAdmin = await prisma.admin.findFirst({
      where: { email: emailNorm },
    });
    if (existingAdmin) {
      await prisma.invitationToken.deleteMany({ where: { invitedEmail: emailNorm } });
      throw new HttpError(409, "Este email ja possui uma conta ativa.");
    }

    const now = nowIso();
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.admin.create({
        data: {
          email: emailNorm,
          passwordHash,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.invitationToken.deleteMany({ where: { invitedEmail: emailNorm } }),
    ]);

    // Se o usuário estiver logado (ex.: admin master no mesmo navegador),
    // evita que continue autenticado como o admin anterior após aceitar o convite.
    clearAuthCookies(res);

    return res.json({ ok: true, email: emailNorm });
  } catch (error) {
    return handleError(res, error, "Erro ao aceitar convite.");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body as {
      login?: string;
      password?: string;
    };

    const loginNorm = normalizeEmail((login ?? "").trim());

    if (!loginNorm || !password) {
      throw new HttpError(400, "Email e senha sao obrigatorios.");
    }

    const admin = await prisma.admin.findFirst({
      where: { email: loginNorm },
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new HttpError(401, "Login ou senha incorretos.");
    }

    if (!admin.isActive) {
      throw new HttpError(403, "Conta inativa.");
    }

    const accessToken = createAccessToken(admin.id);
    const refreshToken = generateOpaqueToken(48);
    const csrfToken = generateOpaqueToken(24);
    const now = nowIso();

    await prisma.refreshSession.create({
      data: {
        adminId: admin.id,
        tokenHash: hashToken(refreshToken),
        csrfTokenHash: hashToken(csrfToken),
        userAgent: getHeaderValue(req, "user-agent") || null,
        ipAddress: getClientIp(req),
        expiresAt: getRefreshExpiryIso(),
        createdAt: now,
      },
    });

    setAuthCookies(res, { accessToken, refreshToken, csrfToken });

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao fazer login.");
  }
});

app.post("/auth/refresh", async (req, res) => {
  try {
    validateCsrfPair(req);

    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      throw new HttpError(401, "Sessao nao encontrada para refresh.");
    }

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      select: {
        id: true,
        adminId: true,
        csrfTokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!session || session.revokedAt) {
      clearAuthCookies(res);
      throw new HttpError(401, "Refresh token invalido.");
    }

    if (new Date(session.expiresAt) < new Date()) {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: nowIso(), lastUsedAt: nowIso() },
      });
      clearAuthCookies(res);
      throw new HttpError(401, "Refresh token expirado.");
    }

    const csrfCookie = getCookie(req, CSRF_COOKIE_NAME) ?? "";
    if (hashToken(csrfCookie) !== session.csrfTokenHash) {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: nowIso(), lastUsedAt: nowIso() },
      });
      clearAuthCookies(res);
      throw new HttpError(403, "CSRF token invalido para refresh.");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: nowIso(), lastUsedAt: nowIso() },
      });
      clearAuthCookies(res);
      throw new HttpError(401, "Sessao invalida.");
    }

    const newRefreshToken = generateOpaqueToken(48);
    const newCsrfToken = generateOpaqueToken(24);
    const newAccessToken = createAccessToken(admin.id);
    const now = nowIso();

    const replacement = await prisma.refreshSession.create({
      data: {
        adminId: admin.id,
        tokenHash: hashToken(newRefreshToken),
        csrfTokenHash: hashToken(newCsrfToken),
        userAgent: getHeaderValue(req, "user-agent") || null,
        ipAddress: getClientIp(req),
        expiresAt: getRefreshExpiryIso(),
        createdAt: now,
      },
      select: { id: true },
    });

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        revokedAt: now,
        replacedBySessionId: replacement.id,
        lastUsedAt: now,
      },
    });

    setAuthCookies(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      csrfToken: newCsrfToken,
    });

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao atualizar sessao.");
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    const now = nowIso();

    if (refreshToken) {
      await prisma.refreshSession.updateMany({
        where: {
          tokenHash: hashToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      });
    }

    clearAuthCookies(res);
    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao encerrar sessao.");
  }
});

app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const adminId = (req as AuthenticatedRequest).auth?.adminId;
    if (!adminId) {
      throw new HttpError(401, "Nao autenticado.");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, phone: true, createdAt: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw new HttpError(401, "Sessao invalida.");
    }

    return res.json({ user: mapAdminToPublic(admin) });
  } catch (error) {
    return handleError(res, error, "Erro ao validar sessao.");
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
