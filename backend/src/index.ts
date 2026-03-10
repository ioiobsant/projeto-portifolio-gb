import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/** Formato de pedido igual ao frontend (OrderItem) */
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

/** GET /orders - Lista todos os pedidos */
app.get("/orders", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
    res.json(orders.map(orderRecordToResponse));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

/** GET /orders/:id - Busca um pedido pelo id */
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

/** POST /orders - Cria um pedido */
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

/** PUT /orders/:id - Atualiza um pedido */
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

/** DELETE /orders/:id - Remove um pedido */
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

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
