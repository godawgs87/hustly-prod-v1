
-- Create a table for storing listings
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  condition TEXT,
  measurements JSONB DEFAULT '{}',
  keywords TEXT[],
  photos TEXT[],
  price_research TEXT,
  shipping_cost DECIMAL(10,2) DEFAULT 9.95,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

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
