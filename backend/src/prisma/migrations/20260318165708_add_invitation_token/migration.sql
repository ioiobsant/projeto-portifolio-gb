-- CreateTable
CREATE TABLE "InvitationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitedEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByAdminId" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "InvitationToken_invitedByAdminId_fkey" FOREIGN KEY ("invitedByAdminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationToken_tokenHash_key" ON "InvitationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitationToken_invitedByAdminId_idx" ON "InvitationToken"("invitedByAdminId");

-- CreateIndex
CREATE INDEX "InvitationToken_expiresAt_idx" ON "InvitationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "InvitationToken_invitedEmail_idx" ON "InvitationToken"("invitedEmail");
