-- Ensure the photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public view" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'photos' );

-- Policy to allow public to view files
CREATE POLICY "Allow public view"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'photos' );

-- Policy to allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'photos' AND owner = auth.uid() )
WITH CHECK ( bucket_id = 'photos' AND owner = auth.uid() );
