
CREATE TABLE public.gold_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gold_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis" ON public.gold_analysis
  FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.gold_analysis;
