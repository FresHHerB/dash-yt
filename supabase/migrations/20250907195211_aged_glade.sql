/*
  # Add RLS policies for roteiros table

  1. Security
    - Enable RLS on `roteiros` table
    - Add policy for authenticated users to read roteiros
    - Add policy for authenticated users to insert roteiros  
    - Add policy for authenticated users to update roteiros
    - Add policy for authenticated users to delete roteiros
*/

-- Enable RLS on roteiros table
ALTER TABLE roteiros ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roteiros
CREATE POLICY "Allow authenticated users to read roteiros"
  ON roteiros
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert roteiros
CREATE POLICY "Allow authenticated users to insert roteiros"
  ON roteiros
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update roteiros
CREATE POLICY "Allow authenticated users to update roteiros"
  ON roteiros
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete roteiros
CREATE POLICY "Allow authenticated users to delete roteiros"
  ON roteiros
  FOR DELETE
  TO authenticated
  USING (true);