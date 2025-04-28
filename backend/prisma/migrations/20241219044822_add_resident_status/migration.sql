-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "alumniNotes" TEXT,
ADD COLUMN     "exitDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';
