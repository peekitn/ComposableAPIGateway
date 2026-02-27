/*
  Warnings:

  - You are about to drop the column `basePath` on the `Api` table. All the data in the column will be lost.
  - You are about to drop the `ApiSchema` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Api` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `baseUrl` to the `Api` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openapiSpec` to the `Api` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Api` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Api` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ApiSchema" DROP CONSTRAINT "ApiSchema_apiId_fkey";

-- AlterTable
ALTER TABLE "Api" DROP COLUMN "basePath",
ADD COLUMN     "baseUrl" TEXT NOT NULL,
ADD COLUMN     "openapiSpec" JSONB NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ApiSchema";

-- CreateIndex
CREATE UNIQUE INDEX "Api_slug_key" ON "Api"("slug");
