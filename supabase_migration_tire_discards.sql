-- ============================================
-- MIGRATION: Create tire_discards table (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tire_discards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode VARCHAR(255) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('Slick','Wet')),
  container_name VARCHAR(100),
  discard_reason TEXT,
  discarded_by UUID REFERENCES auth.users(id),
  discarded_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tire_discards_barcode ON public.tire_discards (barcode);
CREATE INDEX IF NOT EXISTS idx_tire_discards_created_at ON public.tire_discards (created_at);

-- Enable RLS and basic policies for authenticated users
ALTER TABLE public.tire_discards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tire_discards' AND policyname = 'tire_discards_select_authenticated'
  ) THEN
    CREATE POLICY tire_discards_select_authenticated ON public.tire_discards
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tire_discards' AND policyname = 'tire_discards_insert_authenticated'
  ) THEN
    CREATE POLICY tire_discards_insert_authenticated ON public.tire_discards
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END$$;

COMMENT ON TABLE public.tire_discards IS 'Registros de descarte de pneus (1 linha por descarte)';
COMMENT ON COLUMN public.tire_discards.discard_reason IS 'Motivo do descarte (opcional)';
