-- Add additional profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create user_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends')),
  show_email BOOLEAN DEFAULT false,
  show_activity BOOLEAN DEFAULT true,
  show_watchlist BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  comment_notifications BOOLEAN DEFAULT true,
  rating_notifications BOOLEAN DEFAULT false,
  newsletter BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'uz' CHECK (language IN ('uz', 'ru', 'en')),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  movies_per_page INTEGER DEFAULT 20 CHECK (movies_per_page IN (10, 20, 50, 100)),
  default_quality TEXT DEFAULT '1080p' CHECK (default_quality IN ('720p', '1080p', '4k')),
  two_factor_enabled BOOLEAN DEFAULT false,
  login_notifications BOOLEAN DEFAULT true,
  session_timeout INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create user settings
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user settings when profile is created
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON public.profiles;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Create updated_at trigger for user_settings
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON public.user_settings;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default settings for existing users
INSERT INTO public.user_settings (id)
SELECT id FROM public.profiles
ON CONFLICT (id) DO NOTHING;
