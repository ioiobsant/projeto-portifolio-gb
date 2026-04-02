import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  HttpError,
  handleOrderError,
  normalizeEmail,
  normalizePhone,
} from "./orders-common";

function joinName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export const customersRouter = Router();

customersRouter.get("/lookup", async (req, res) => {
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
    return handleOrderError(res, error, "Erro ao buscar cliente.");
  }
});
