-- First, let's make sure we're working with the right schema and add better error handling
-- Enable RLS (Row Level Security)
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movie_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Genres table
CREATE TABLE IF NOT EXISTS public.genres (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    name_uz TEXT,
    name_ru TEXT,
    name_en TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table
CREATE TABLE IF NOT EXISTS public.movies (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    title_uz TEXT,
    title_ru TEXT,
    title_en TEXT,
    description TEXT,
    description_uz TEXT,
    description_ru TEXT,
    description_en TEXT,
    poster_url TEXT,
    trailer_url TEXT,
    release_year INTEGER,
    duration INTEGER, -- in minutes
    rating DECIMAL(3,1) DEFAULT 0,
    imdb_rating DECIMAL(3,1),
    director TEXT,
    actors TEXT[],
    country TEXT,
    language TEXT,
    status movie_status DEFAULT 'active',
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movie genres junction table
CREATE TABLE IF NOT EXISTS public.movie_genres (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES public.genres(id) ON DELETE CASCADE,
    UNIQUE(movie_id, genre_id)
);

-- Movie tags junction table
CREATE TABLE IF NOT EXISTS public.movie_tags (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
    UNIQUE(movie_id, tag_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    parent_id INTEGER REFERENCES public.comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_title ON public.movies USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON public.movies(release_year);
CREATE INDEX IF NOT EXISTS idx_comments_movie_id ON public.comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(movie_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.movies 
    SET view_count = view_count + 1 
    WHERE id = movie_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Movies policies
DROP POLICY IF EXISTS "Movies are viewable by everyone" ON public.movies;
CREATE POLICY "Movies are viewable by everyone" ON public.movies
    FOR SELECT USING (status = 'active' OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert movies" ON public.movies;
CREATE POLICY "Admins can insert movies" ON public.movies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update movies" ON public.movies;
CREATE POLICY "Admins can update movies" ON public.movies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete movies" ON public.movies;
CREATE POLICY "Admins can delete movies" ON public.movies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Comments policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Genres and tags policies (readable by all, writable by admins)
DROP POLICY IF EXISTS "Genres are viewable by everyone" ON public.genres;
CREATE POLICY "Genres are viewable by everyone" ON public.genres
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage genres" ON public.genres;
CREATE POLICY "Admins can manage genres" ON public.genres
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
CREATE POLICY "Tags are viewable by everyone" ON public.tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Junction table policies
DROP POLICY IF EXISTS "Movie genres are viewable by everyone" ON public.movie_genres;
CREATE POLICY "Movie genres are viewable by everyone" ON public.movie_genres
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage movie genres" ON public.movie_genres;
CREATE POLICY "Admins can manage movie genres" ON public.movie_genres
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Movie tags are viewable by everyone" ON public.movie_tags;
CREATE POLICY "Movie tags are viewable by everyone" ON public.movie_tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage movie tags" ON public.movie_tags;
CREATE POLICY "Admins can manage movie tags" ON public.movie_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
