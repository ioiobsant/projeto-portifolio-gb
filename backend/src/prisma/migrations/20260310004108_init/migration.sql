-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "size" TEXT,
    "customer" JSONB NOT NULL,
    "specs" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleValue" INTEGER NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "notes" TEXT
);
