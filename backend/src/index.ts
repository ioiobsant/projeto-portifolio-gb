import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-alterar-em-producao";
const TOKEN_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

type OrderCustomer = { name: string; whatsapp: string; email: string };
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
  id: string;
  category: string;
  model: string;
  productImageUrl?: string;
  size?: string;
  customer: OrderCustomer;
  specs: OrderSpecs;
  quantity: number;
  saleValue: number;
  deliveryDate: string;
  status: string;
  createdAt: string;
  notes?: string;
}

function orderRecordToResponse(record: {
  id: string;
  category: string;
  model: string;
  productImageUrl: string | null;
  size: string | null;
  customer: unknown;
  specs: unknown;
  quantity: number;
  saleValue: number;
  deliveryDate: string;
  status: string;
  createdAt: string;
  notes: string | null;
}) {
  return {
    id: record.id,
    category: record.category,
    model: record.model,
    productImageUrl: record.productImageUrl ?? undefined,
    size: record.size ?? undefined,
    customer: record.customer as OrderCustomer,
    specs: record.specs as OrderSpecs,
    quantity: record.quantity,
    saleValue: record.saleValue,
    deliveryDate: record.deliveryDate,
    status: record.status,
    createdAt: record.createdAt,
    notes: record.notes ?? undefined,
  };
}

app.get("/orders", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
    res.json(orders.map(orderRecordToResponse));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(orderRecordToResponse(order));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const body = req.body as OrderBody;
    if (!body.id || !body.category || !body.model || !body.customer || !body.specs || body.quantity == null || body.saleValue == null || !body.deliveryDate || !body.status || !body.createdAt) {
      return res.status(400).json({ error: "Campos obrigatórios: id, category, model, customer, specs, quantity, saleValue, deliveryDate, status, createdAt" });
    }
    const existing = await prisma.order.findUnique({ where: { id: body.id } });
    if (existing) return res.status(409).json({ error: "Já existe um pedido com esse ID" });

    const order = await prisma.order.create({
      data: {
        id: body.id,
        category: body.category,
        model: body.model,
        productImageUrl: body.productImageUrl ?? null,
        size: body.size ?? null,
        customer: body.customer as object,
        specs: body.specs as object,
        quantity: body.quantity,
        saleValue: body.saleValue,
        deliveryDate: body.deliveryDate,
        status: body.status,
        createdAt: body.createdAt,
        notes: body.notes ?? null,
      },
    });
    res.status(201).json(orderRecordToResponse(order));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

app.put("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body as OrderBody;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pedido não encontrado" });

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.id != null && { id: body.id }),
        ...(body.category != null && { category: body.category }),
        ...(body.model != null && { model: body.model }),
        ...(body.productImageUrl !== undefined && { productImageUrl: body.productImageUrl ?? null }),
        ...(body.size !== undefined && { size: body.size ?? null }),
        ...(body.customer != null && { customer: body.customer as object }),
        ...(body.specs != null && { specs: body.specs as object }),
        ...(body.quantity != null && { quantity: body.quantity }),
        ...(body.saleValue != null && { saleValue: body.saleValue }),
        ...(body.deliveryDate != null && { deliveryDate: body.deliveryDate }),
        ...(body.status != null && { status: body.status }),
        ...(body.createdAt != null && { createdAt: body.createdAt }),
        ...(body.notes !== undefined && { notes: body.notes ?? null }),
      },
    });
    res.json(orderRecordToResponse(order));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar pedido" });
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pedido não encontrado" });
    await prisma.order.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao remover pedido" });
  }
});

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

app.post("/auth/register/request", async (req, res) => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };
    const emailTrim = typeof email === "string" ? email.trim() : "";
    const phoneNorm = normalizePhone(phone ?? "");
    if (!emailTrim && !phoneNorm) {
      return res.status(400).json({ error: "Informe o email ou o número de celular." });
    }
    const identifier = emailTrim ? emailTrim.toLowerCase() : phoneNorm;
    const existingAdmin = await prisma.admin.findFirst({
      where: emailTrim
        ? { email: emailTrim.toLowerCase() }
        : { phone: phoneNorm },
    });
    if (existingAdmin) {
      return res.status(409).json({ error: "Já existe uma conta com esse email ou celular." });
    }
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    const token = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();
    await prisma.verificationToken.create({
      data: { identifier, token, expiresAt },
    });
    console.log(`[Auth] Código de verificação para ${identifier}: ${token}`);
    const isDev = process.env.NODE_ENV !== "production";
    return res.status(200).json(
      isDev ? { ok: true, devCode: token } : { ok: true }
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao enviar código." });
  }
});

app.post("/auth/register/confirm", async (req, res) => {
  try {
    const { email, phone, token, password } = req.body as {
      email?: string;
      phone?: string;
      token: string;
      password: string;
    };
    const emailTrim = typeof email === "string" ? email.trim() : "";
    const phoneNorm = normalizePhone(phone ?? "");
    if (!emailTrim && !phoneNorm) {
      return res.status(400).json({ error: "Informe o email ou o número de celular." });
    }
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: "Código e senha (mín. 6 caracteres) são obrigatórios." });
    }
    const identifier = emailTrim ? emailTrim.toLowerCase() : phoneNorm;
    const record = await prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expiresAt: "desc" },
    });
    if (!record || record.token !== String(token).trim()) {
      return res.status(400).json({ error: "Código inválido ou expirado." });
    }
    if (new Date(record.expiresAt) < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return res.status(400).json({ error: "Código expirado. Solicite um novo." });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();
    await prisma.admin.create({
      data: {
        email: emailTrim || null,
        phone: phoneNorm || null,
        passwordHash,
        createdAt: now,
      },
    });
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao criar conta." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body as { login: string; password: string };
    const loginTrim = (login ?? "").trim();
    const loginNorm = loginTrim.includes("@")
      ? loginTrim.toLowerCase()
      : normalizePhone(loginTrim);
    if (!loginNorm || !password) {
      return res.status(400).json({ error: "Login e senha são obrigatórios." });
    }
    const admin = await prisma.admin.findFirst({
      where: loginTrim.includes("@")
        ? { email: loginTrim.toLowerCase() }
        : { phone: loginNorm },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: "Login ou senha incorretos." });
    }
    const token = jwt.sign(
      { sub: admin.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao fazer login." });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
