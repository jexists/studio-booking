-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancelRequestRate" INTEGER,
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "noShowAt" TIMESTAMP(3);
