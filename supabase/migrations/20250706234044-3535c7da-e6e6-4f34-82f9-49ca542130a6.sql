-- Add platform-specific category fields to listings table
ALTER TABLE public.listings 
ADD COLUMN mercari_category_id text,
ADD COLUMN mercari_category_path text,
ADD COLUMN poshmark_category_id text,
ADD COLUMN poshmark_category_path text,
ADD COLUMN depop_category_id text,
ADD COLUMN depop_category_path text,
ADD COLUMN facebook_category_id text,
ADD COLUMN facebook_category_path text;

-- Create category mapping table for intelligent mapping
CREATE TABLE public.category_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  internal_category text NOT NULL,
  platform text NOT NULL,
  platform_category_id text NOT NULL,
  platform_category_path text,
  confidence_score numeric DEFAULT 0.8,
  usage_count integer DEFAULT 1,
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on category_mappings
ALTER TABLE public.category_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for category mappings
CREATE POLICY "Users can access their own category mappings" 
ON public.category_mappings 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_category_mappings_user_category ON public.category_mappings(user_id, internal_category, platform);
CREATE INDEX idx_category_mappings_usage ON public.category_mappings(usage_count DESC, confidence_score DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_category_mappings_updated_at
BEFORE UPDATE ON public.category_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();