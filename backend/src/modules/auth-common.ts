import crypto from "crypto";
import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";

const ACCESS_COOKIE_NAME = "gba_access";
const REFRESH_COOKIE_NAME = "gba_refresh";
const CSRF_COOKIE_NAME = "gba_csrf";

export interface AuthenticatedRequest extends Request {
  auth?: { adminId: string };
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

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

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
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

export function getCookie(req: Request, name: string): string | null {
  return parseCookies(req)[name] ?? null;
}

export function getHeaderValue(req: Request, headerName: string): string {
  const value = req.headers[headerName.toLowerCase() as keyof Request["headers"]];
  if (Array.isArray(value)) return value[0] ?? "";
  if (typeof value === "string") return value;
  return "";
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(size = 48): string {
  return crypto.randomBytes(size).toString("base64url");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getClientIp(req: Request): string | null {
  const forwarded = getHeaderValue(req, "x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    return first?.trim() || null;
  }
  const direct = req.socket.remoteAddress;
  return direct ?? null;
}

function createAccessToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, env.jwtSecret, {
    expiresIn: `${env.accessTokenTtlMinutes}m`,
  });
}

function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, env.jwtSecret) as JwtPayload | string;
  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Token JWT invalido.");
  }
  return payload.sub;
}

export function getAdminIdFromRequest(req: Request): string {
  const accessFromCookie = getCookie(req, ACCESS_COOKIE_NAME);
  const accessFromHeader = extractBearerToken(req.headers.authorization);
  const token = accessFromCookie ?? accessFromHeader;

  if (!token) {
    throw new HttpError(401, "Nao autenticado.");
  }

  return verifyAccessToken(token);
}

export function getRefreshExpiryIso(): string {
  return addDays(new Date(), env.refreshTokenTtlDays).toISOString();
}

export function mapAdminToPublic(admin: AdminPublic): AdminPublic {
  return {
    id: admin.id,
    email: admin.email,
    phone: admin.phone,
    createdAt: admin.createdAt,
  };
}

export function setAuthCookies(res: Response, payload: AuthCookies) {
  const common = {
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookie(ACCESS_COOKIE_NAME, payload.accessToken, {
    ...common,
    httpOnly: true,
    maxAge: env.accessTokenTtlMinutes * 60 * 1000,
  });

  res.cookie(REFRESH_COOKIE_NAME, payload.refreshToken, {
    ...common,
    httpOnly: true,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });

  res.cookie(CSRF_COOKIE_NAME, payload.csrfToken, {
    ...common,
    httpOnly: false,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  const common = {
    secure: env.isProd,
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

export function validateCsrfPair(req: Request) {
  const { cookieToken, headerToken } = readCsrfPair(req);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new HttpError(403, "Falha de validacao do CSRF token.");
  }
}

export function handleError(res: Response, error: unknown, fallbackMessage: string) {
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

export function createTokensForAdmin(adminId: string) {
  return {
    accessToken: createAccessToken(adminId),
    refreshToken: generateOpaqueToken(48),
    csrfToken: generateOpaqueToken(24),
  };
}
