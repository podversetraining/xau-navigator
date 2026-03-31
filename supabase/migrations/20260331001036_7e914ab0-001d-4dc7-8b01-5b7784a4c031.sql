
CREATE TABLE public.broadcast_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  status TEXT NOT NULL DEFAULT 'maintenance' CHECK (status IN ('live', 'updating', 'maintenance')),
  analysis JSONB,
  error TEXT,
  current_slide INTEGER NOT NULL DEFAULT 0,
  slide_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_update_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.broadcast_state (id, status) VALUES ('global', 'maintenance');

ALTER TABLE public.broadcast_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read broadcast_state"
  ON public.broadcast_state
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_state;
