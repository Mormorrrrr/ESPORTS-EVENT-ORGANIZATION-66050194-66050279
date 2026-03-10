-- CreateTable
CREATE TABLE "Tournament" (
    "tournament_id" SERIAL NOT NULL,
    "tournament_name" TEXT NOT NULL,
    "tournament_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("tournament_id")
);

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "Tournament"("tournament_id") ON DELETE RESTRICT ON UPDATE CASCADE;
