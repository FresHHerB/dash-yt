/*
  # Fix RLS policies for vozes and apis tables

  1. Security Updates
    - Add INSERT, UPDATE, DELETE policies for vozes table
    - Add INSERT, UPDATE, DELETE policies for apis table
    - Allow authenticated users to perform all CRUD operations
    - Maintain read access for anonymous users where appropriate

  2. Tables Affected
    - `vozes` - voice models table
    - `apis` - API keys table

  3. Policy Changes
    - Enable full CRUD access for authenticated users
    - Secure write operations to authenticated users only
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert vozes" ON vozes;
DROP POLICY IF EXISTS "Allow authenticated users to update vozes" ON vozes;
DROP POLICY IF EXISTS "Allow authenticated users to delete vozes" ON vozes;
DROP POLICY IF EXISTS "Allow public read access to vozes" ON vozes;

DROP POLICY IF EXISTS "Allow authenticated users to insert apis" ON apis;
DROP POLICY IF EXISTS "Allow authenticated users to update apis" ON apis;
DROP POLICY IF EXISTS "Allow authenticated users to delete apis" ON apis;
DROP POLICY IF EXISTS "Allow public read access to apis" ON apis;

-- Create comprehensive RLS policies for vozes table
CREATE POLICY "Allow authenticated users to insert vozes"
  ON vozes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vozes"
  ON vozes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete vozes"
  ON vozes
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow public read access to vozes"
  ON vozes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create comprehensive RLS policies for apis table
CREATE POLICY "Allow authenticated users to insert apis"
  ON apis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update apis"
  ON apis
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete apis"
  ON apis
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow public read access to apis"
  ON apis
  FOR SELECT
  TO anon, authenticated
  USING (true);