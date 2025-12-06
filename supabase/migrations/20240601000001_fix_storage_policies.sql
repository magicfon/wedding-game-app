-- Ensure the wedding-photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts (and remove incorrect 'photos' policies)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public view" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;

-- Policy to allow authenticated users to upload files to wedding-photos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'wedding-photos' );

-- Policy to allow public to view files from wedding-photos
CREATE POLICY "Allow public view"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'wedding-photos' );

-- Policy to allow users to update their own files in wedding-photos
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'wedding-photos' AND owner = auth.uid() )
WITH CHECK ( bucket_id = 'wedding-photos' AND owner = auth.uid() );
