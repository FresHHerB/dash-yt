/*
  # Allow public read access to canais table

  1. Security Changes
    - Add policy to allow anonymous users to read from canais table
    - This enables the PromptUpdatePage to load channels without authentication
    - Maintains existing authenticated user policies

  2. Notes
    - RLS remains enabled for security
    - Only SELECT operations are allowed for anonymous users
    - INSERT/UPDATE/DELETE still require authentication
*/

-- Allow anonymous users to read from canais table
CREATE POLICY "Allow public read access to canais"
  ON canais
  FOR SELECT
  TO anon
  USING (true);

-- Also ensure authenticated users can read (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'canais' 
    AND policyname = 'Allow authenticated users to read canais'
  ) THEN
    CREATE POLICY "Allow authenticated users to read canais"
      ON canais
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;