PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Remove duplicidade de códigos de verificação antes de criar índice único.
DELETE FROM "VerificationToken"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "identifier"
        ORDER BY "expiresAt" DESC, "id" DESC
      ) AS rn
    FROM "VerificationToken"
  ) t
  WHERE t.rn > 1
);

-- Remove duplicidade de email/phone de admin para permitir índices únicos.
UPDATE "Admin"
SET "email" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "email"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS rn
    FROM "Admin"
    WHERE "email" IS NOT NULL
  ) t
  WHERE t.rn > 1
);

UPDATE "Admin"
SET "phone" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "phone"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS rn
    FROM "Admin"
    WHERE "phone" IS NOT NULL
  ) t
  WHERE t.rn > 1
);

CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

INSERT OR IGNORE INTO "new_Customer" (
  "id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "createdAt",
  "updatedAt"
)
SELECT
  'cus_' || lower(hex(randomblob(8))) AS "id",
  CASE
    WHEN TRIM(COALESCE(json_extract(o."customer", '$.firstName'), '')) <> ''
      THEN TRIM(COALESCE(json_extract(o."customer", '$.firstName'), ''))
    WHEN TRIM(COALESCE(json_extract(o."customer", '$.name'), '')) <> ''
      THEN TRIM(COALESCE(json_extract(o."customer", '$.name'), ''))
    ELSE 'Cliente'
  END AS "firstName",
  CASE
    WHEN TRIM(COALESCE(json_extract(o."customer", '$.lastName'), '')) <> ''
      THEN TRIM(COALESCE(json_extract(o."customer", '$.lastName'), ''))
    ELSE 'Sem sobrenome'
  END AS "lastName",
  NULLIF(LOWER(TRIM(COALESCE(json_extract(o."customer", '$.email'), ''))), '') AS "email",
  CASE
    WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(json_extract(o."customer", '$.whatsapp'), ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', ''), '.', ''), '/', ''), ',', '') <> ''
      THEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(json_extract(o."customer", '$.whatsapp'), ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', ''), '.', ''), '/', ''), ',', '')
    ELSE 'sem-celular-' || o."id"
  END AS "phone",
  COALESCE(NULLIF(o."createdAt", ''), datetime('now')) AS "createdAt",
  datetime('now') AS "updatedAt"
FROM "Order" o;

CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "size" TEXT,
    "customerId" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleValue" INTEGER NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "new_Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Order" (
  "id",
  "category",
  "model",
  "productImageUrl",
  "size",
  "customerId",
  "specs",
  "quantity",
  "saleValue",
  "deliveryDate",
  "status",
  "createdAt",
  "notes"
)
SELECT
  o."id",
  o."category",
  o."model",
  o."productImageUrl",
  o."size",
  COALESCE(c_phone."id", c_email."id") AS "customerId",
  o."specs",
  o."quantity",
  o."saleValue",
  o."deliveryDate",
  o."status",
  o."createdAt",
  o."notes"
FROM "Order" o
LEFT JOIN "new_Customer" c_phone
  ON c_phone."phone" = (
    CASE
      WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(json_extract(o."customer", '$.whatsapp'), ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', ''), '.', ''), '/', ''), ',', '') <> ''
        THEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(json_extract(o."customer", '$.whatsapp'), ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', ''), '.', ''), '/', ''), ',', '')
      ELSE 'sem-celular-' || o."id"
    END
  )
LEFT JOIN "new_Customer" c_email
  ON c_email."email" = NULLIF(LOWER(TRIM(COALESCE(json_extract(o."customer", '$.email'), ''))), '');

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
ALTER TABLE "new_Customer" RENAME TO "Customer";

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "Admin_phone_key" ON "Admin"("phone");
CREATE UNIQUE INDEX "VerificationToken_identifier_key" ON "VerificationToken"("identifier");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
