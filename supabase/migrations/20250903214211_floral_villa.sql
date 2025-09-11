/*
  # Fix RLS policies for users table authentication

  1. Security Changes
    - Add policy to allow public read access for authentication
    - This enables login functionality by allowing the app to query users by username
    
  2. Notes
    - The policy allows reading user data for authentication purposes
    - Password verification happens in the client after fetching the user data
*/

-- Create policy to allow reading users for authentication
CREATE POLICY "Allow public read for authentication"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);