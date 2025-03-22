
-- Create the medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the health_tips table
CREATE TABLE IF NOT EXISTS public.health_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for medications table
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own medications"
  ON public.medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medications"
  ON public.medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications"
  ON public.medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications"
  ON public.medications FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for health_tips table
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health tips or public tips"
  ON public.health_tips FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own health tips"
  ON public.health_tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health tips"
  ON public.health_tips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health tips"
  ON public.health_tips FOR DELETE
  USING (auth.uid() = user_id);
