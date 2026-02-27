-- CreateTable
CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "apiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
