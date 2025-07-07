
-- Enable Row Level Security on listings table (if not already enabled)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;

-- Create policies for user access
CREATE POLICY "Users can view their own listings" 
  ON public.listings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own listings" 
  ON public.listings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" 
  ON public.listings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" 
  ON public.listings 
  FOR DELETE 
  USING (auth.uid() = user_id);
