-- Astyns v2 : quêtes élargies, objectifs d'inscription, lecture guidée, confirmation de paiement par code.
-- À appliquer avec : npx prisma migrate deploy   (ou coller ce fichier dans l'éditeur SQL de Supabase)

ALTER TYPE "QuestMetric" ADD VALUE IF NOT EXISTS 'CORRECT';
ALTER TYPE "QuestMetric" ADD VALUE IF NOT EXISTS 'QUIZZES';
ALTER TYPE "QuestMetric" ADD VALUE IF NOT EXISTS 'REVIEWS';
ALTER TYPE "QuestMetric" ADD VALUE IF NOT EXISTS 'GAMES';

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ChapterProgress" ADD COLUMN IF NOT EXISTS "partsRead" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "codeHash" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "codeSentAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "codeAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

ALTER TABLE "QuizAttempt" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'chapter';
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "state" JSONB;
