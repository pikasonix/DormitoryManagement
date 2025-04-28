/*
  Warnings:

  - The values [FOUNDATION,SCHOOL] on the enum `AssistanceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [MALE,FEMALE] on the enum `RoomType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `uploadedAt` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `parentAddress` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `parentName` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `parentPhone` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Resident` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `gender` on the `Resident` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterEnum
BEGIN;
CREATE TYPE "AssistanceType_new" AS ENUM ('YAYASAN', 'DIAKONIA');
ALTER TABLE "Resident" ALTER COLUMN "assistance" TYPE "AssistanceType_new" USING ("assistance"::text::"AssistanceType_new");
ALTER TYPE "AssistanceType" RENAME TO "AssistanceType_old";
ALTER TYPE "AssistanceType_new" RENAME TO "AssistanceType";
DROP TYPE "AssistanceType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'USER';

-- AlterEnum
BEGIN;
CREATE TYPE "RoomType_new" AS ENUM ('SINGLE', 'DOUBLE', 'WARD');
ALTER TABLE "Room" ALTER COLUMN "type" TYPE "RoomType_new" USING ("type"::text::"RoomType_new");
ALTER TYPE "RoomType" RENAME TO "RoomType_old";
ALTER TYPE "RoomType_new" RENAME TO "RoomType";
DROP TYPE "RoomType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "uploadedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "parentAddress",
DROP COLUMN "parentName",
DROP COLUMN "parentPhone",
DROP COLUMN "status",
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "floor" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropEnum
DROP TYPE "Status";
