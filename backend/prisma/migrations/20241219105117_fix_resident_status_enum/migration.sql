/*
  Warnings:

  - The `status` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('NEW', 'ACTIVE', 'ALUMNI');

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "status",
ADD COLUMN     "status" "ResidentStatus" NOT NULL DEFAULT 'NEW';
