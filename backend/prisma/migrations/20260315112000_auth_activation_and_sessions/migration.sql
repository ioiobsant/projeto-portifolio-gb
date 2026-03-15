PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "Admin" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "updatedAt" TEXT NOT NULL DEFAULT '';

UPDATE "Admin"
SET "updatedAt" = COALESCE(NULLIF("createdAt", ''), datetime('now'))
WHERE "updatedAt" = '';

-- Mantém contas já existentes aptas para login após a migração.
UPDATE "Admin"
SET "isActive" = true;

CREATE TABLE "ActivationToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "consumedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  CONSTRAINT "ActivationToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RefreshSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfTokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TEXT NOT NULL,
  "revokedAt" TEXT,
  "replacedBySessionId" TEXT,
  "createdAt" TEXT NOT NULL,
  "lastUsedAt" TEXT,
  CONSTRAINT "RefreshSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ActivationToken_tokenHash_key" ON "ActivationToken" ("tokenHash");
CREATE INDEX "ActivationToken_adminId_idx" ON "ActivationToken" ("adminId");
CREATE INDEX "ActivationToken_expiresAt_idx" ON "ActivationToken" ("expiresAt");

CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession" ("tokenHash");
CREATE INDEX "RefreshSession_adminId_idx" ON "RefreshSession" ("adminId");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession" ("expiresAt");
CREATE INDEX "RefreshSession_revokedAt_idx" ON "RefreshSession" ("revokedAt");

DROP TABLE "VerificationToken";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
