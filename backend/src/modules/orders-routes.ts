import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  HttpError,
  OrderBody,
  handleOrderError,
  mapOrderRecordToResponse,
  resolveCustomer,
} from "./orders-common";

export const ordersRouter = Router();

ordersRouter.get("/", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders.map((order) => mapOrderRecordToResponse(order)));
  } catch (error) {
    return handleOrderError(res, error, "Erro ao listar pedidos.");
  }
});

ordersRouter.get("/:id", async (req, res) => {
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
    return handleOrderError(res, error, "Erro ao buscar pedido.");
  }
});

ordersRouter.post("/", async (req, res) => {
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
    return handleOrderError(res, error, "Erro ao criar pedido.");
  }
});

ordersRouter.put("/:id", async (req, res) => {
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
    return handleOrderError(res, error, "Erro ao atualizar pedido.");
  }
});

ordersRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, "Pedido nao encontrado.");
    }

    await prisma.order.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    return handleOrderError(res, error, "Erro ao remover pedido.");
  }
});
