CREATE TABLE IF NOT EXISTS height_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    height_cm NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE height_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own height records" 
ON height_records FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own height records" 
ON height_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);
