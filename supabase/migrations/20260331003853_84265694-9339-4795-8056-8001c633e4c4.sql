INSERT INTO storage.buckets (id, name, public)
VALUES ('market-data', 'market-data', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read market-data" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'market-data');

CREATE POLICY "Service write market-data" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'market-data');

CREATE POLICY "Service update market-data" ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id = 'market-data');

CREATE POLICY "Service delete market-data" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'market-data');