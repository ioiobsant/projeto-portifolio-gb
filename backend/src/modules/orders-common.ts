import { type Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type OrderCustomer = {
  name: string;
  whatsapp: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type OrderSpecs = {
  hasPainting: boolean;
  paintColor?: string;
  paintFinish?: string;
  fabric?: string;
  foam?: string;
  base?: string;
  manufactureType: "Fabrica\u00e7\u00e3o pr\u00f3pria" | "Reforma";
};

export interface OrderBody {
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

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function normalizeEmail(email: string): string {
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

function nowIso(): string {
  return new Date().toISOString();
}

export function mapOrderRecordToResponse(record: OrderWithCustomerRecord) {
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

export async function resolveCustomer(customer: OrderCustomer) {
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
    throw new HttpError(400, "Celular e obrigatorio para cadastrar um novo cliente.");
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

export function handleOrderError(res: Response, error: unknown, fallbackMessage: string) {
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
