/*
  # Add UPDATE policy for canais table

  1. Security
    - Add policy for authenticated users to update canais records
    - Allow users to update any canal record (since this appears to be an admin system)

  2. Changes
    - Create UPDATE policy on canais table for authenticated users
*/

-- Enable RLS on canais table if not already enabled
ALTER TABLE canais ENABLE ROW LEVEL SECURITY;

-- Create UPDATE policy for canais table
CREATE POLICY "Allow authenticated users to update canais"
  ON canais
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also add INSERT policy in case it's needed for upsert
CREATE POLICY "Allow authenticated users to insert canais"
  ON canais
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add SELECT policy if not exists
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