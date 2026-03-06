/*
  Warnings:

  - A unique constraint covering the columns `[slug,version]` on the table `Api` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Api_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Api_slug_version_key" ON "Api"("slug", "version");
