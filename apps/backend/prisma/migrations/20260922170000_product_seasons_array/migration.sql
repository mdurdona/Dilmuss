-- Add new multi-value seasons column
ALTER TABLE "Product" ADD COLUMN "seasons" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill from the old single-value "season" column, splitting comma-separated values
-- (e.g. "kuz, bahor" -> {kuz,bahor}) and trimming whitespace on each part.
UPDATE "Product"
SET "seasons" = (
  SELECT array_agg(trim(part))
  FROM unnest(string_to_array("season", ',')) AS part
)
WHERE "season" IS NOT NULL AND "season" != '';

-- Drop the old single-value column
ALTER TABLE "Product" DROP COLUMN "season";
