import { type NextFunction, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import {
  AuthenticatedRequest,
  getAdminIdFromRequest,
  HttpError,
  validateCsrfPair,
} from "./auth-common";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = getAdminIdFromRequest(req);
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { isActive: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "Sessao invalida." });
    }

    (req as AuthenticatedRequest).auth = { adminId };
    return next();
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(401).json({ error: "Token de acesso invalido ou expirado." });
  }
}

export function requireCsrfForWrites(req: Request, res: Response, next: NextFunction) {
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
