/*
  # Add voice metadata fields

  1. New Columns
    - `idioma` (text) - Language of the voice
    - `genero` (text) - Gender of the voice  
    - `preview_url` (text) - URL for voice preview audio

  2. Changes
    - Add new columns to vozes table for storing voice metadata
    - These fields will be auto-populated from platform APIs
*/

DO $$
BEGIN
  -- Add idioma column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vozes' AND column_name = 'idioma'
  ) THEN
    ALTER TABLE vozes ADD COLUMN idioma text DEFAULT '';
  END IF;

  -- Add genero column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vozes' AND column_name = 'genero'
  ) THEN
    ALTER TABLE vozes ADD COLUMN genero text DEFAULT '';
  END IF;

  -- Add preview_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vozes' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE vozes ADD COLUMN preview_url text DEFAULT '';
  END IF;
END $$;