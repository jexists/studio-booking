-- CreateEnum
CREATE TYPE "ShipStatus" AS ENUM ('PREPARING', 'SHIPPING', 'DELIVERED');

-- AlterTable
ALTER TABLE "Work" ADD COLUMN "shipStatus" "ShipStatus",
ADD COLUMN "carrier" TEXT,
ADD COLUMN "trackingNo" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);
