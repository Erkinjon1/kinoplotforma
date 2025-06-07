-- Create missing junction tables if they don't exist
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

-- RLS Policies for junction tables
CREATE POLICY "Movie genres are viewable by everyone" ON public.movie_genres
    FOR SELECT USING (true);

CREATE POLICY "Movie genres are manageable by admins" ON public.movie_genres
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Movie tags are viewable by everyone" ON public.movie_tags
    FOR SELECT USING (true);

CREATE POLICY "Movie tags are manageable by admins" ON public.movie_tags
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

-- Insert sample movie-genre relationships
INSERT INTO public.movie_genres (movie_id, genre_id) VALUES
(1, 1), (1, 2), -- Inception - Drama, Comedy
(2, 3), (2, 5), -- Interstellar - Action, Thriller
(3, 1), (3, 7), -- The Shawshank Redemption - Drama, Sci-Fi
(4, 1), (4, 2), -- Forrest Gump - Drama, Comedy
(5, 3), (5, 5), (5, 9), -- Dark Knight - Action, Thriller, Crime
(6, 3), (6, 7), (6, 5) -- Inception - Action, Sci-Fi, Thriller
ON CONFLICT (movie_id, genre_id) DO NOTHING;

-- Insert sample movie-tag relationships
INSERT INTO public.movie_tags (movie_id, tag_id) VALUES
(1, 1), (1, 2), -- Inception - Yangi, Mashhur
(2, 2), (2, 3), -- Interstellar - Mashhur, Tavsiya etiladi
(3, 6), (3, 8), -- The Shawshank Redemption - Klassik, Mukofotli
(4, 6), (4, 8), -- Forrest Gump - Klassik, Mukofotli
(5, 2), (5, 8), -- Dark Knight - Mashhur, Mukofotli
(6, 2), (6, 3) -- Inception - Mashhur, Tavsiya etiladi
ON CONFLICT (movie_id, tag_id) DO NOTHING;
