-- Link Teacher's Guide with Pupil's Book for merged lesson intelligence
ALTER TABLE "curriculum_books" ADD COLUMN IF NOT EXISTS "companion_book_id" TEXT;

ALTER TABLE "curriculum_books"
  ADD CONSTRAINT "curriculum_books_companion_book_id_fkey"
  FOREIGN KEY ("companion_book_id") REFERENCES "curriculum_books"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "curriculum_books_companion_book_id_idx" ON "curriculum_books"("companion_book_id");
