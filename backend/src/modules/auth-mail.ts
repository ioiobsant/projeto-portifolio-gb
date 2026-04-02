import nodemailer from "nodemailer";
import { env } from "../config/env";

function buildResetPasswordLink(token: string): string {
  const baseUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  return `${baseUrl}/login?reset=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetLink = buildResetPasswordLink(token);

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    console.log(`[Auth] Token de redefinicao para ${to}: ${token}`);
    console.log(`[Auth] Link: ${resetLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

  await transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to,
    subject: "Redefinicao de senha - Genice Brandao Atelier",
    text: `Ola!\n\nUse o codigo abaixo para redefinir sua senha (valido por ${env.passwordResetTokenTtlMinutes} minutos):\n\n${token}\n\nOu acesse o link:\n${resetLink}\n\nSe voce nao solicitou essa alteracao, ignore este e-mail.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#b06a3a">Genice Brandao Atelier</h2>
        <p>Ola! Para redefinir sua senha, use o codigo abaixo:</p>
        <div style="background:#f5f0eb;padding:16px 24px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#3d1f0a">
          ${token}
        </div>
        <p style="margin-top:16px">Ou clique no botao:</p>
        <a href="${resetLink}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#b06a3a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Redefinir senha
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Este codigo expira em ${env.passwordResetTokenTtlMinutes} minutos.<br>
          Se voce nao solicitou essa alteracao, ignore este e-mail.
        </p>
      </div>
    `,
  });
}

function buildInviteLink(token: string): string {
  const baseUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  return `${baseUrl}/convite?token=${encodeURIComponent(token)}`;
}

export async function sendInvitationEmail(to: string, token: string): Promise<void> {
  const inviteLink = buildInviteLink(token);

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    console.log(`[Auth] Token de convite para ${to}: ${token}`);
    console.log(`[Auth] Link: ${inviteLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

  const ttlHours = Math.round(env.invitationTokenTtlMinutes / 60);
  await transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to,
    subject: "Convite para acesso - Genice Brandao Atelier",
    text: `Ola!\n\nVoce foi convidado a acessar o painel. Use o codigo abaixo para cadastrar sua senha (valido por ${ttlHours}h):\n\n${token}\n\nOu acesse o link:\n${inviteLink}\n\nSe voce nao esperava este convite, ignore este e-mail.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#b06a3a">Genice Brandao Atelier</h2>
        <p>Voce foi convidado a acessar o painel. Use o codigo abaixo para cadastrar sua senha:</p>
        <div style="background:#f5f0eb;padding:16px 24px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#3d1f0a">
          ${token}
        </div>
        <p style="margin-top:16px">Ou clique no botao:</p>
        <a href="${inviteLink}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#b06a3a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Cadastrar minha senha
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Este convite expira em ${ttlHours} horas.<br>
          Se voce nao esperava este convite, ignore este e-mail.
        </p>
      </div>
    `,
  });
}
