-- Create the 'captures' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'captures',
    'captures',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "Allow users to SELECT their own captures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to INSERT their own captures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to UPDATE their own captures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to DELETE their own captures" ON storage.objects;

-- Create RLS policies for storage.objects
CREATE POLICY "Allow users to SELECT their own captures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to INSERT their own captures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to UPDATE their own captures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to DELETE their own captures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);
