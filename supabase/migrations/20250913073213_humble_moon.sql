/*
  # Fix text_thumb column name in roteiros table

  1. Changes
    - Rename column from text_tumb to text_thumb for consistency
    - This aligns with the frontend expectations and API responses

  2. Security
    - No RLS changes needed as table already has proper policies
*/

-- Rename the column from text_tumb to text_thumb
ALTER TABLE roteiros RENAME COLUMN text_tumb TO text_thumb;

-- Add comment for documentation
COMMENT ON COLUMN roteiros.text_thumb IS 'Text that appears on the video thumbnail';