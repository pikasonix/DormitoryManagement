/*
  Warnings:

  - You are about to drop the column `filename` on the `Document` table. All the data in the column will be lost.
  - Added the required column `name` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "filename",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Resident" ALTER COLUMN "birthDate" DROP NOT NULL,
ALTER COLUMN "birthDate" SET DATA TYPE TEXT;
