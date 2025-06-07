-- Complete database setup with all features

-- Create additional tables for complete functionality
CREATE TABLE IF NOT EXISTS public.watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS public.ratings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS public.movie_views (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    movie_id INTEGER REFERENCES public.movies(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can manage their own watchlist" ON public.watchlist
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own ratings" ON public.ratings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Movie views are insertable by anyone" ON public.movie_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own movie views" ON public.movie_views
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Update increment_view_count function to be more robust
CREATE OR REPLACE FUNCTION increment_view_count(movie_id INTEGER, user_ip INET DEFAULT NULL, user_agent_string TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Insert view record
    INSERT INTO public.movie_views (user_id, movie_id, ip_address, user_agent)
    VALUES (current_user_id, movie_id, user_ip, user_agent_string);
    
    -- Update movie view count
    UPDATE public.movies 
    SET view_count = view_count + 1 
    WHERE id = movie_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate average rating
CREATE OR REPLACE FUNCTION calculate_movie_rating(movie_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    SELECT AVG(rating) INTO avg_rating
    FROM public.ratings
    WHERE movie_id = calculate_movie_rating.movie_id;
    
    UPDATE public.movies
    SET rating = COALESCE(avg_rating, 0)
    WHERE id = movie_id;
    
    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update movie rating when rating changes
CREATE OR REPLACE FUNCTION handle_rating_change()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_movie_rating(OLD.movie_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_movie_rating(NEW.movie_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rating_change_trigger ON public.ratings;
CREATE TRIGGER rating_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.ratings
    FOR EACH ROW EXECUTE FUNCTION handle_rating_change();

-- Add more sample data
INSERT INTO public.movies (
    title, title_uz, title_ru, title_en,
    description, description_uz, description_ru, description_en,
    poster_url, release_year, duration, rating, imdb_rating,
    director, actors, country, language, status
) VALUES
(
    'Forrest Gump',
    'Forrest Gamp',
    'Форрест Гамп',
    'Forrest Gump',
    'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
    'Kennedi va Jonson prezidentligi, Vetnam urushi, Uotergeyt mojarosi va boshqa tarixiy voqealar IQ darajasi 75 ga teng Alabama fuqarosining nuqtai nazaridan ochib beriladi.',
    'Президентства Кеннеди и Джонсона, война во Вьетнаме, Уотергейтский скандал и другие исторические события разворачиваются с точки зрения жителя Алабамы с IQ 75.',
    'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
    'https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',
    1994, 142, 8.8, 8.8,
    'Robert Zemeckis',
    ARRAY['Tom Hanks', 'Robin Wright', 'Gary Sinise'],
    'USA', 'English', 'active'
),
(
    'The Dark Knight',
    'Qorong''u Ritsar',
    'Тёмный рыцарь',
    'The Dark Knight',
    'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    'Joker nomi bilan tanilgan tahdid Gotam aholisiga vayronagarchilik va tartibsizlik olib kelganda, Batman eng katta psixologik va jismoniy sinovlardan birini qabul qilishi kerak.',
    'Когда угроза, известная как Джокер, сеет хаос и разрушения среди жителей Готэма, Бэтмен должен принять одно из величайших психологических и физических испытаний.',
    'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    2008, 152, 9.0, 9.0,
    'Christopher Nolan',
    ARRAY['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    'USA', 'English', 'active'
),
(
    'Inception',
    'Boshlanish',
    'Начало',
    'Inception',
    'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    'Tush almashish texnologiyasi orqali korporativ sirlarni o''g''irlaydigan o''g''ri bosh direktor ongiga g''oyani joylashtirish vazifasini oladi.',
    'Вору, который крадет корпоративные секреты с помощью технологии совместных сновидений, дается обратная задача - внедрить идею в сознание генерального директора.',
    'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    2010, 148, 8.8, 8.8,
    'Christopher Nolan',
    ARRAY['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    'USA', 'English', 'active'
);

-- Link new movies with genres and tags
INSERT INTO public.movie_genres (movie_id, genre_id) VALUES
(4, 1), (4, 2), -- Forrest Gump - Drama, Comedy
(5, 3), (5, 5), (5, 9), -- Dark Knight - Action, Thriller, Crime
(6, 3), (6, 7), (6, 5); -- Inception - Action, Sci-Fi, Thriller

INSERT INTO public.movie_tags (movie_id, tag_id) VALUES
(4, 6), (4, 8), -- Forrest Gump - Klassik, Mukofotli
(5, 2), (5, 8), -- Dark Knight - Mashhur, Mukofotli
(6, 2), (6, 3); -- Inception - Mashhur, Tavsiya etiladi

-- Grant permissions for new tables
GRANT ALL ON public.watchlist TO anon, authenticated;
GRANT ALL ON public.ratings TO anon, authenticated;
GRANT ALL ON public.movie_views TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
