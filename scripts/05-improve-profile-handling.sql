-- Improve profile handling and fix potential issues

-- Update the trigger function to handle duplicates better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Use INSERT ... ON CONFLICT to handle duplicates gracefully
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        'user'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to be more permissive for profile operations
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- Add upsert policy
CREATE POLICY "Users can upsert their own profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    );

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any potential duplicate or orphaned profiles
-- (Run this carefully in production)
DELETE FROM public.profiles 
WHERE id NOT IN (
    SELECT id FROM auth.users
);

-- Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
