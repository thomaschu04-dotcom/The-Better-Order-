
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS borough text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS favorite_chains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gems_balance int NOT NULL DEFAULT 0;

-- 2. gem_transactions
CREATE TABLE IF NOT EXISTS public.gem_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason text NOT NULL,
  restaurant text,
  order_total_usd numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gem_transactions TO authenticated;
GRANT ALL ON public.gem_transactions TO service_role;
ALTER TABLE public.gem_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gem tx select" ON public.gem_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own gem tx insert" ON public.gem_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. rewards_catalog
CREATE TABLE IF NOT EXISTS public.rewards_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  gems_cost int NOT NULL,
  restaurant text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards_catalog TO anon, authenticated;
GRANT ALL ON public.rewards_catalog TO service_role;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog public read" ON public.rewards_catalog FOR SELECT TO anon, authenticated USING (true);

-- 4. reward_redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards_catalog(id),
  gems_spent int NOT NULL,
  code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions select" ON public.reward_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own redemptions insert" ON public.reward_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Trigger to enforce & apply balance changes on redemption
CREATE OR REPLACE FUNCTION public.apply_reward_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance int;
  cost int;
BEGIN
  SELECT gems_cost INTO cost FROM public.rewards_catalog WHERE id = NEW.reward_id;
  IF cost IS NULL THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;
  NEW.gems_spent := cost;
  SELECT gems_balance INTO current_balance FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < cost THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;
  UPDATE public.profiles SET gems_balance = gems_balance - cost WHERE id = NEW.user_id;
  INSERT INTO public.gem_transactions(user_id, delta, reason) VALUES (NEW.user_id, -cost, 'redemption');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_reward_redemption ON public.reward_redemptions;
CREATE TRIGGER trg_apply_reward_redemption
  BEFORE INSERT ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.apply_reward_redemption();

-- 6. Seed rewards catalog
INSERT INTO public.rewards_catalog (name, description, gems_cost, restaurant) VALUES
  ('Free drink', 'Any small drink at your favorite chain', 250, NULL),
  ('Free side', 'Fries, chips, or a side salad', 500, NULL),
  ('Free entrée', 'An entrée at your restaurant of choice', 1000, NULL),
  ('Combo meal', 'Entrée + side + drink combo', 2000, NULL),
  ('Catering credit', '$25 credit toward a catering order', 5000, NULL)
ON CONFLICT DO NOTHING;
