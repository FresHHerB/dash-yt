/*
  # Fix RLS policies for INSERT operations

  1. Security Updates
    - Drop existing restrictive INSERT policies on vozes and apis tables
    - Create new permissive INSERT policies for authenticated users
    - Ensure authenticated users can perform all CRUD operations
    - Maintain read access for anonymous users

  2. Changes
    - Remove policies that block INSERT operations
    - Add proper INSERT policies with correct permissions
    - Fix policy conditions to allow data insertion
*/

-- Drop existing problematic INSERT policies
DROP POLICY IF EXISTS "Allow authenticated users to insert vozes" ON vozes;
DROP POLICY IF EXISTS "Allow authenticated users to insert apis" ON apis;

-- Create new permissive INSERT policies for vozes table
CREATE POLICY "Enable insert for authenticated users"
  ON vozes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create new permissive INSERT policies for apis table  
CREATE POLICY "Enable insert for authenticated users"
  ON apis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure UPDATE and DELETE policies exist and are permissive
DROP POLICY IF EXISTS "Allow authenticated users to update vozes" ON vozes;
CREATE POLICY "Enable update for authenticated users"
  ON vozes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete vozes" ON vozes;
CREATE POLICY "Enable delete for authenticated users"
  ON vozes
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update apis" ON apis;
CREATE POLICY "Enable update for authenticated users"
  ON apis
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete apis" ON apis;
CREATE POLICY "Enable delete for authenticated users"
  ON apis
  FOR DELETE
  TO authenticated
  USING (true);