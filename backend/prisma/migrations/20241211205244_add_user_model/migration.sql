/*
  Warnings:

  - The values [YAYASAN,DIAKONIA] on the enum `AssistanceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [USER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `birthdate` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `birthplace` on the `Resident` table. All the data in the column will be lost.
  - Added the required column `birthDate` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthPlace` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentAddress` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentName` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentPhone` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `gender` on the `Resident` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `floor` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'ALUMNI', 'INTERNSHIP');

-- AlterEnum
BEGIN;
CREATE TYPE "AssistanceType_new" AS ENUM ('FOUNDATION', 'SCHOOL');
ALTER TABLE "Resident" ALTER COLUMN "assistance" TYPE "AssistanceType_new" USING ("assistance"::text::"AssistanceType_new");
ALTER TYPE "AssistanceType" RENAME TO "AssistanceType_old";
ALTER TYPE "AssistanceType_new" RENAME TO "AssistanceType";
DROP TYPE "AssistanceType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
COMMIT;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "birthdate",
DROP COLUMN "birthplace",
ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "birthPlace" TEXT NOT NULL,
ADD COLUMN     "parentAddress" TEXT NOT NULL,
ADD COLUMN     "parentName" TEXT NOT NULL,
ADD COLUMN     "parentPhone" TEXT NOT NULL,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "gender",
ADD COLUMN     "gender" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "floor" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- DropEnum
DROP TYPE "Gender";
