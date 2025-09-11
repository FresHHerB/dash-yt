/*
  # Fix RLS policies for canais table

  1. Security Updates
    - Ensure proper UPDATE policy for authenticated users on canais table
    - Ensure proper SELECT policy for authenticated users on canais table
    - Remove any conflicting policies and recreate them correctly

  2. Policy Details
    - SELECT: Allow authenticated users to read canais data
    - UPDATE: Allow authenticated users to update canais data
*/

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read canais" ON canais;
DROP POLICY IF EXISTS "Allow authenticated users to update canais" ON canais;
DROP POLICY IF EXISTS "Allow authenticated users to insert canais" ON canais;

-- Create proper policies for canais table
CREATE POLICY "Allow authenticated users to read canais"
  ON canais
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update canais"
  ON canais
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert canais"
  ON canais
  FOR INSERT
  TO authenticated
  WITH CHECK (true);