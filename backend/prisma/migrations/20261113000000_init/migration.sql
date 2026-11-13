-- pgvector (자료 검색용 임베딩)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "ClassProgram" AS ENUM ('ONEDAY', 'REGULAR');

-- CreateEnum
CREATE TYPE "ClassKind" AS ENUM ('HAND', 'WHEEL');

-- CreateEnum
CREATE TYPE "ReservationChannel" AS ENUM ('WEB', 'DM', 'NAVER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkStage" AS ENUM ('FORMING', 'BISQUE', 'GLAZED', 'GLAZE_FIRED', 'DONE', 'PICKED_UP');

-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('VISIT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "MakeupStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('SUPPLIER', 'NOTE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'QUOTED', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "passwordHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "staffId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegularCourse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "program" "ClassProgram" NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "courseId" INTEGER,
    "weekNo" INTEGER,
    "memo" TEXT,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "reservationNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "channel" "ReservationChannel" NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "sessionId" INTEGER,
    "courseId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "refundRate" INTEGER,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" SERIAL NOT NULL,
    "workNo" TEXT NOT NULL,
    "reservationId" INTEGER,
    "sessionId" INTEGER,
    "classDate" TIMESTAMP(3) NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phoneLast4" TEXT,
    "itemName" TEXT NOT NULL,
    "clay" TEXT,
    "glaze" TEXT,
    "stage" "WorkStage" NOT NULL DEFAULT 'FORMING',
    "broken" BOOLEAN NOT NULL DEFAULT false,
    "shelf" TEXT,
    "pickupMethod" "PickupMethod",
    "completedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkStageLog" (
    "id" SERIAL NOT NULL,
    "workId" INTEGER NOT NULL,
    "fromStage" "WorkStage" NOT NULL,
    "toStage" "WorkStage" NOT NULL,
    "staffId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkStageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MakeupRequest" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "missedSessionId" INTEGER NOT NULL,
    "targetSessionId" INTEGER NOT NULL,
    "status" "MakeupStatus" NOT NULL DEFAULT 'REQUESTED',
    "rejectReason" TEXT,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MakeupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "page" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionLog" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "isSafety" BOOLEAN NOT NULL,
    "hasEvidence" BOOLEAN NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInquiry" (
    "id" SERIAL NOT NULL,
    "orgName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "headcount" INTEGER NOT NULL,
    "place" TEXT,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "quoteAmount" INTEGER,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlazeWarning" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,

    CONSTRAINT "GlazeWarning_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_token_key" ON "StaffInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_token_key" ON "StaffSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RegularCourse_name_key" ON "RegularCourse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_code_key" ON "ClassSession"("code");

-- CreateIndex
CREATE INDEX "ClassSession_startsAt_idx" ON "ClassSession"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservationNo_key" ON "Reservation"("reservationNo");

-- CreateIndex
CREATE INDEX "Reservation_sessionId_idx" ON "Reservation"("sessionId");

-- CreateIndex
CREATE INDEX "Reservation_courseId_idx" ON "Reservation"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Work_workNo_key" ON "Work"("workNo");

-- CreateIndex
CREATE INDEX "Work_stage_idx" ON "Work"("stage");

-- CreateIndex
CREATE INDEX "Work_classDate_idx" ON "Work"("classDate");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "RegularCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "RegularCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkStageLog" ADD CONSTRAINT "WorkStageLog_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupRequest" ADD CONSTRAINT "MakeupRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupRequest" ADD CONSTRAINT "MakeupRequest_missedSessionId_fkey" FOREIGN KEY ("missedSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupRequest" ADD CONSTRAINT "MakeupRequest_targetSessionId_fkey" FOREIGN KEY ("targetSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

