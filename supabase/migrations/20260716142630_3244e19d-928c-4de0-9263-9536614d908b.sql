
CREATE TABLE public.order_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant text NOT NULL,
  order_number text NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  gems_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant, order_number)
);

GRANT SELECT, INSERT ON public.order_claims TO authenticated;
GRANT ALL ON public.order_claims TO service_role;

ALTER TABLE public.order_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own order claims select" ON public.order_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own order claims insert" ON public.order_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
