/*
  # Add audio file column to vozes table

  1. Changes
    - Add `audio_file_path` column to store the bucket file path
    - Keep `preview_url` for external URLs as fallback
    - Add index for better performance

  2. Security
    - No RLS changes needed as table already has proper policies
*/

-- Add new column for storing bucket file path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vozes' AND column_name = 'audio_file_path'
  ) THEN
    ALTER TABLE vozes ADD COLUMN audio_file_path text DEFAULT NULL;
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_vozes_audio_file_path ON vozes(audio_file_path);

-- Add comment for documentation
COMMENT ON COLUMN vozes.audio_file_path IS 'Path to audio file in Supabase storage bucket';