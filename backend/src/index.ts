import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Prisma, PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("A variável JWT_SECRET é obrigatória em produção.");
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-alterar-em-producao";
const TOKEN_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 10;

app.use(cors());
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

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Token JWT ausente ou inválido." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    const sub =
      typeof payload === "object" && typeof payload.sub === "string"
        ? payload.sub
        : null;

    if (!sub) {
      return res.status(401).json({ error: "Token JWT inválido." });
    }

    (req as AuthenticatedRequest).auth = { adminId: sub };
    return next();
  } catch {
    return res.status(401).json({ error: "Token JWT inválido ou expirado." });
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

  const now = new Date().toISOString();
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
      "Celular é obrigatório para cadastrar um novo cliente."
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
      return res.status(409).json({ error: "Conflito de dados únicos." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado." });
    }
  }

  console.error(error);
  return res.status(500).json({ error: fallbackMessage });
}

app.use("/orders", requireAuth);
app.use("/customers", requireAuth);

app.get("/customers/lookup", async (req, res) => {
  try {
    const email = normalizeEmail(String(req.query.email ?? ""));
    const phone = normalizePhone(String(req.query.phone ?? ""));

    if (!email && !phone) {
      return res
        .status(400)
        .json({ error: "Informe email ou celular para busca." });
    }

    const identifiers: Prisma.CustomerWhereInput[] = [];
    if (email) identifiers.push({ email });
    if (phone) identifiers.push({ phone });

    const matches = await prisma.customer.findMany({
      where: { OR: identifiers },
      take: 2,
    });

    if (matches.length > 1) {
      return res.status(409).json({
        error:
          "Conflito de cadastro: email e celular pertencem a clientes diferentes.",
      });
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
    return handleError(res, error, "Erro ao listar pedidos");
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    return res.json(mapOrderRecordToResponse(order));
  } catch (error) {
    return handleError(res, error, "Erro ao buscar pedido");
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
        "Campos obrigatórios: id, category, model, customer, specs, quantity, saleValue, deliveryDate, status, createdAt"
      );
    }

    const existing = await prisma.order.findUnique({ where: { id: body.id } });
    if (existing) {
      throw new HttpError(409, "Já existe um pedido com esse ID");
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
    return handleError(res, error, "Erro ao criar pedido");
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
      throw new HttpError(404, "Pedido não encontrado");
    }

    if (body.id && body.id !== id) {
      const idInUse = await prisma.order.findUnique({ where: { id: body.id } });
      if (idInUse) {
        throw new HttpError(409, "Já existe um pedido com esse ID");
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
    return handleError(res, error, "Erro ao atualizar pedido");
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Pedido não encontrado");
    }

    await prisma.order.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Erro ao remover pedido");
  }
});

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

app.post("/auth/register/request", async (req, res) => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };
    const emailNorm = normalizeEmail(email ?? "");
    const phoneNorm = normalizePhone(phone ?? "");

    if (!emailNorm && !phoneNorm) {
      throw new HttpError(400, "Informe o email ou o número de celular.");
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          ...(emailNorm ? [{ email: emailNorm }] : []),
          ...(phoneNorm ? [{ phone: phoneNorm }] : []),
        ],
      },
    });

    if (existingAdmin) {
      throw new HttpError(409, "Já existe uma conta com esse email ou celular.");
    }

    const identifier = emailNorm || phoneNorm;
    const token = generateSixDigitCode();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    await prisma.verificationToken.upsert({
      where: { identifier },
      update: { token, expiresAt },
      create: { identifier, token, expiresAt },
    });

    console.log(`[Auth] Código de verificação para ${identifier}: ${token}`);
    const isDev = process.env.NODE_ENV !== "production";
    return res
      .status(200)
      .json(isDev ? { ok: true, devCode: token } : { ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao enviar código.");
  }
});

app.post("/auth/register/confirm", async (req, res) => {
  try {
    const { email, phone, token, password } = req.body as {
      email?: string;
      phone?: string;
      token?: string;
      password?: string;
    };

    const emailNorm = normalizeEmail(email ?? "");
    const phoneNorm = normalizePhone(phone ?? "");

    if (!emailNorm && !phoneNorm) {
      throw new HttpError(400, "Informe o email ou o número de celular.");
    }

    if (!token || !password || password.length < 6) {
      throw new HttpError(
        400,
        "Código e senha (mín. 6 caracteres) são obrigatórios."
      );
    }

    const identifier = emailNorm || phoneNorm;

    const record = await prisma.verificationToken.findUnique({
      where: { identifier },
    });

    if (!record || record.token !== String(token).trim()) {
      throw new HttpError(400, "Código inválido ou expirado.");
    }

    if (new Date(record.expiresAt) < new Date()) {
      await prisma.verificationToken.delete({ where: { identifier } });
      throw new HttpError(400, "Código expirado. Solicite um novo.");
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          ...(emailNorm ? [{ email: emailNorm }] : []),
          ...(phoneNorm ? [{ phone: phoneNorm }] : []),
        ],
      },
    });

    if (existingAdmin) {
      throw new HttpError(409, "Já existe uma conta com esse email ou celular.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    await prisma.admin.create({
      data: {
        email: emailNorm || null,
        phone: phoneNorm || null,
        passwordHash,
        createdAt: now,
      },
    });

    await prisma.verificationToken.delete({ where: { identifier } });
    return res.status(201).json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao criar conta.");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body as {
      login?: string;
      password?: string;
    };

    const rawLogin = (login ?? "").trim();
    const isEmailLogin = rawLogin.includes("@");
    const loginNorm = isEmailLogin
      ? normalizeEmail(rawLogin)
      : normalizePhone(rawLogin);

    if (!loginNorm || !password) {
      throw new HttpError(400, "Login e senha são obrigatórios.");
    }

    const admin = await prisma.admin.findFirst({
      where: isEmailLogin ? { email: loginNorm } : { phone: loginNorm },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new HttpError(401, "Login ou senha incorretos.");
    }

    const token = jwt.sign({ sub: admin.id, role: "admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token });
  } catch (error) {
    return handleError(res, error, "Erro ao fazer login.");
  }
});

app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const adminId = (req as AuthenticatedRequest).auth?.adminId;
    if (!adminId) {
      throw new HttpError(401, "Token JWT inválido.");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, phone: true, createdAt: true },
    });

    if (!admin) {
      throw new HttpError(401, "Usuário do token não encontrado.");
    }

    return res.json({ admin });
  } catch (error) {
    return handleError(res, error, "Erro ao validar sessão.");
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
