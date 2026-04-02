export const env = {
  isProd: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-alterar-em-producao",
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  activationTokenTtlMinutes: Number(process.env.ACTIVATION_TOKEN_TTL_MINUTES ?? 30),
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30),
  invitationTokenTtlMinutes: Number(process.env.INVITATION_TOKEN_TTL_MINUTES ?? 60 * 24),
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  adminEmail: (process.env.ADMIN_EMAIL ?? "ioiobsant@gmail.com").trim().toLowerCase(),
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  port: process.env.PORT ?? 3001,
};
