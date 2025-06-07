-- Fix policy conflicts by dropping existing policies first

-- Drop existing policies for movie_genres if they exist
DROP POLICY IF EXISTS "Movie genres are viewable by everyone" ON public.movie_genres;
DROP POLICY IF EXISTS "Movie genres are manageable by admins" ON public.movie_genres;
DROP POLICY IF EXISTS "Admins can manage movie genres" ON public.movie_genres;

-- Drop existing policies for movie_tags if they exist
DROP POLICY IF EXISTS "Movie tags are viewable by everyone" ON public.movie_tags;
DROP POLICY IF EXISTS "Movie tags are manageable by admins" ON public.movie_tags;
DROP POLICY IF EXISTS "Admins can manage movie tags" ON public.movie_tags;

-- Create junction tables if they don't exist
CREATE TABLE IF NOT EXISTS public.movie_genres (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES public.genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, genre_id)
);

CREATE TABLE IF NOT EXISTS public.movie_tags (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, tag_id)
);

-- Enable RLS for junction tables
ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;

-- Create new policies for movie_genres
CREATE POLICY "Movie genres viewable by all" ON public.movie_genres
    FOR SELECT USING (true);

CREATE POLICY "Movie genres manageable by admins" ON public.movie_genres
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create new policies for movie_tags
CREATE POLICY "Movie tags viewable by all" ON public.movie_tags
    FOR SELECT USING (true);

CREATE POLICY "Movie tags manageable by admins" ON public.movie_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.movie_genres TO anon, authenticated;
GRANT ALL ON public.movie_tags TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Insert sample movie-genre relationships (ignore conflicts)
INSERT INTO public.movie_genres (movie_id, genre_id) VALUES
(1, 1), (1, 2), -- Movie 1 - Drama, Comedy
(2, 3), (2, 5), -- Movie 2 - Action, Thriller
(3, 1), (3, 7), -- Movie 3 - Drama, Sci-Fi
(4, 1), (4, 2), -- Movie 4 - Drama, Comedy
(5, 3), (5, 5), (5, 9), -- Movie 5 - Action, Thriller, Crime
(6, 3), (6, 7), (6, 5) -- Movie 6 - Action, Sci-Fi, Thriller
ON CONFLICT (movie_id, genre_id) DO NOTHING;

-- Insert sample movie-tag relationships (ignore conflicts)
INSERT INTO public.movie_tags (movie_id, tag_id) VALUES
(1, 1), (1, 2), -- Movie 1 - Yangi, Mashhur
(2, 2), (2, 3), -- Movie 2 - Mashhur, Tavsiya etiladi
(3, 6), (3, 8), -- Movie 3 - Klassik, Mukofotli
(4, 6), (4, 8), -- Movie 4 - Klassik, Mukofotli
(5, 2), (5, 8), -- Movie 5 - Mashhur, Mukofotli
(6, 2), (6, 3) -- Movie 6 - Mashhur, Tavsiya etiladi
ON CONFLICT (movie_id, tag_id) DO NOTHING;

-- Verify tables exist and have data
SELECT 'movie_genres' as table_name, COUNT(*) as count FROM public.movie_genres
UNION ALL
SELECT 'movie_tags' as table_name, COUNT(*) as count FROM public.movie_tags;
