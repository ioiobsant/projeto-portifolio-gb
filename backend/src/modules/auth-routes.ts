import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import {
  addMinutes,
  AuthenticatedRequest,
  clearAuthCookies,
  createTokensForAdmin,
  getClientIp,
  getCookie,
  getHeaderValue,
  getRefreshExpiryIso,
  handleError,
  hashToken,
  HttpError,
  mapAdminToPublic,
  normalizeEmail,
  normalizePhone,
  nowIso,
  setAuthCookies,
  validateCsrfPair,
  generateOpaqueToken,
} from "./auth-common";
import { requireAuth, requireCsrfForWrites } from "./auth-middleware";
import { sendInvitationEmail, sendPasswordResetEmail } from "./auth-mail";

const REFRESH_COOKIE_NAME = "gba_refresh";
const CSRF_COOKIE_NAME = "gba_csrf";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, phone, password } = req.body as {
      email?: string;
      phone?: string;
      password?: string;
    };

    const emailNorm = normalizeEmail(email ?? "");
    const phoneNorm = normalizePhone(phone ?? "");

    if (!emailNorm && !phoneNorm) {
      throw new HttpError(400, "Informe email ou celular.");
    }

    if (!password || password.length < 8) {
      throw new HttpError(400, "A senha deve ter no minimo 8 caracteres.");
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          ...(emailNorm ? [{ email: emailNorm }] : []),
          ...(phoneNorm ? [{ phone: phoneNorm }] : []),
        ],
      },
    });

    if (existingAdmin?.isActive) {
      throw new HttpError(409, "Ja existe uma conta ativa com esse email ou celular.");
    }

    const now = nowIso();
    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

    const admin = existingAdmin
      ? await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: {
            email: emailNorm || null,
            phone: phoneNorm || null,
            passwordHash,
            isActive: false,
            updatedAt: now,
          },
        })
      : await prisma.admin.create({
          data: {
            email: emailNorm || null,
            phone: phoneNorm || null,
            passwordHash,
            isActive: false,
            createdAt: now,
            updatedAt: now,
          },
        });

    await prisma.activationToken.deleteMany({ where: { adminId: admin.id } });

    const activationToken = generateOpaqueToken(32);
    const tokenHash = hashToken(activationToken);

    await prisma.activationToken.create({
      data: {
        adminId: admin.id,
        tokenHash,
        createdAt: now,
        expiresAt: addMinutes(new Date(), env.activationTokenTtlMinutes).toISOString(),
      },
    });

    console.log(`[Auth] Token de ativacao para ${emailNorm || phoneNorm}: ${activationToken}`);

    return res.status(201).json(env.isProd ? { ok: true } : { ok: true, activationToken });
  } catch (error) {
    return handleError(res, error, "Erro ao registrar usuario.");
  }
});

authRouter.post("/activate", async (req, res) => {
  try {
    const { token } = req.body as { token?: string };
    const rawToken = (token ?? "").trim();

    if (!rawToken) {
      throw new HttpError(400, "Token de ativacao obrigatorio.");
    }

    const tokenHash = hashToken(rawToken);

    const activation = await prisma.activationToken.findUnique({
      where: { tokenHash },
    });

    if (!activation) {
      throw new HttpError(400, "Token de ativacao invalido.");
    }

    if (activation.consumedAt) {
      throw new HttpError(400, "Token de ativacao ja utilizado.");
    }

    if (new Date(activation.expiresAt) < new Date()) {
      await prisma.activationToken.delete({ where: { id: activation.id } });
      throw new HttpError(400, "Token de ativacao expirado.");
    }

    const now = nowIso();

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: activation.adminId },
        data: {
          isActive: true,
          updatedAt: now,
        },
      }),
      prisma.activationToken.deleteMany({ where: { adminId: activation.adminId } }),
    ]);

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao ativar conta.");
  }
});

authRouter.post("/forgot-password", async (req, res) => {
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
        expiresAt: addMinutes(new Date(), env.passwordResetTokenTtlMinutes).toISOString(),
      },
    });

    await sendPasswordResetEmail(emailNorm, token);

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao solicitar redefinicao de senha.");
  }
});

authRouter.post("/reset-password", async (req, res) => {
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
    const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);

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

authRouter.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body as {
      login?: string;
      password?: string;
    };

    const rawLogin = (login ?? "").trim();
    const isEmailLogin = rawLogin.includes("@");
    const loginNorm = isEmailLogin ? normalizeEmail(rawLogin) : normalizePhone(rawLogin);

    if (!loginNorm || !password) {
      throw new HttpError(400, "Login e senha sao obrigatorios.");
    }

    const admin = await prisma.admin.findFirst({
      where: isEmailLogin ? { email: loginNorm } : { phone: loginNorm },
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
      throw new HttpError(403, "Conta ainda nao ativada.");
    }

    const { accessToken, refreshToken, csrfToken } = createTokensForAdmin(admin.id);
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

authRouter.post("/refresh", async (req, res) => {
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

    const nextTokens = createTokensForAdmin(admin.id);
    const now = nowIso();

    const replacement = await prisma.refreshSession.create({
      data: {
        adminId: admin.id,
        tokenHash: hashToken(nextTokens.refreshToken),
        csrfTokenHash: hashToken(nextTokens.csrfToken),
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

    setAuthCookies(res, nextTokens);

    return res.json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao atualizar sessao.");
  }
});

authRouter.post("/logout", async (req, res) => {
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

authRouter.get("/me", requireAuth, async (req, res) => {
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

authRouter.get("/admins", requireAuth, async (_req, res) => {
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

authRouter.delete("/admins/:id", requireAuth, requireCsrfForWrites, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = (req as AuthenticatedRequest).auth?.adminId;

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

    if (target.email && normalizeEmail(target.email) === env.adminEmail) {
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

authRouter.post("/invite-admin", requireAuth, async (req, res) => {
  try {
    const adminId = (req as AuthenticatedRequest).auth?.adminId;
    if (!adminId) throw new HttpError(401, "Nao autenticado.");

    const inviter = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { email: true, isActive: true },
    });
    if (!inviter || !inviter.isActive) {
      throw new HttpError(401, "Nao autenticado.");
    }
    const inviterEmail = normalizeEmail(inviter.email ?? "");
    if (inviterEmail !== env.adminEmail) {
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
        expiresAt: addMinutes(new Date(), env.invitationTokenTtlMinutes).toISOString(),
      },
    });

    await sendInvitationEmail(emailNorm, token);

    return res.status(201).json({ ok: true });
  } catch (error) {
    return handleError(res, error, "Erro ao enviar convite.");
  }
});

authRouter.post("/accept-invite", async (req, res) => {
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
    const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);

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

    clearAuthCookies(res);

    return res.json({ ok: true, email: emailNorm });
  } catch (error) {
    return handleError(res, error, "Erro ao aceitar convite.");
  }
});
