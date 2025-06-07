-- Fix user_settings table structure
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Create user_settings table with correct structure
CREATE TABLE public.user_settings (
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
  autoplay_trailers BOOLEAN DEFAULT true,
  sound_effects BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user settings
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON public.profiles;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Create updated_at trigger
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
