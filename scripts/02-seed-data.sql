-- Insert sample genres
INSERT INTO public.genres (name, name_uz, name_ru, name_en, description) VALUES
('Drama', 'Drama', 'Драма', 'Drama', 'Dramatic films with emotional storylines'),
('Comedy', 'Komediya', 'Комедия', 'Comedy', 'Funny and entertaining movies'),
('Action', 'Jangari', 'Боевик', 'Action', 'Action-packed adventure films'),
('Romance', 'Romantik', 'Романтика', 'Romance', 'Love stories and romantic films'),
('Thriller', 'Triller', 'Триллер', 'Thriller', 'Suspenseful and thrilling movies'),
('Horror', 'Qo''rqinchli', 'Ужасы', 'Horror', 'Scary and horror movies'),
('Sci-Fi', 'Ilmiy-fantastik', 'Научная фантастика', 'Science Fiction', 'Science fiction movies'),
('Fantasy', 'Fantastika', 'Фэнтези', 'Fantasy', 'Fantasy and magical movies'),
('Crime', 'Jinoyat', 'Криминал', 'Crime', 'Crime and detective stories'),
('Documentary', 'Hujjatli', 'Документальный', 'Documentary', 'Documentary films');

-- Insert sample tags
INSERT INTO public.tags (name, color) VALUES
('Yangi', '#10B981'),
('Mashhur', '#F59E0B'),
('Tavsiya etiladi', '#3B82F6'),
('O''zbek kino', '#8B5CF6'),
('Xalqaro', '#EF4444'),
('Klassik', '#6B7280'),
('Oilaviy', '#EC4899'),
('Mukofotli', '#F97316');

-- Insert sample movies
INSERT INTO public.movies (
    title, title_uz, title_ru, title_en, 
    description, description_uz, description_ru, description_en,
    poster_url, release_year, duration, rating, imdb_rating,
    director, actors, country, language, status
) VALUES
(
    'The Shawshank Redemption',
    'Shoushenk qamoqxonasidan qochish',
    'Побег из Шоушенка',
    'The Shawshank Redemption',
    'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    'Ikki mahbus ko''p yillar davomida do''stlashib, oddiy ezgulik harakatlari orqali taskin va nihoyat najot topadilar.',
    'Два заключенных сближаются за несколько лет, находя утешение и окончательное искупление через акты обычной порядочности.',
    'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    1994, 142, 9.3, 9.3,
    'Frank Darabont',
    ARRAY['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
    'USA', 'English', 'active'
),
(
    'The Godfather',
    'Krestnyy otets',
    'Крёстный отец',
    'The Godfather',
    'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    'Tashkil etilgan jinoyat sulolasining qarigan patriarxi o''zining yashirin imperiyasini istaksiz o''g''liga topshiradi.',
    'Стареющий патриарх династии организованной преступности передает контроль над своей тайной империей своему неохотному сыну.',
    'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    1972, 175, 9.2, 9.2,
    'Francis Ford Coppola',
    ARRAY['Marlon Brando', 'Al Pacino', 'James Caan'],
    'USA', 'English', 'active'
),
(
    'Pulp Fiction',
    'Arzon fantastika',
    'Криминальное чтиво',
    'Pulp Fiction',
    'The lives of two mob hitmen, a boxer, a gangster''s wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    'Ikki mafiya qotilining, bokschi, gangsterning xotini va bir juft restoran qaroqchilarining hayoti to''rt ta zo''ravonlik va najot haqidagi ertaklarda o''zaro bog''lanadi.',
    'Жизни двух киллеров мафии, боксера, жены гангстера и пары грабителей закусочных переплетаются в четырех историях о насилии и искуплении.',
    'The lives of two mob hitmen, a boxer, a gangster''s wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    1994, 154, 8.9, 8.9,
    'Quentin Tarantino',
    ARRAY['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
    'USA', 'English', 'active'
);

-- Link movies with genres
INSERT INTO public.movie_genres (movie_id, genre_id) VALUES
(1, 1), -- Shawshank - Drama
(2, 1), -- Godfather - Drama
(2, 9), -- Godfather - Crime
(3, 1), -- Pulp Fiction - Drama
(3, 9); -- Pulp Fiction - Crime

-- Link movies with tags
INSERT INTO public.movie_tags (movie_id, tag_id) VALUES
(1, 6), -- Shawshank - Klassik
(1, 8), -- Shawshank - Mukofotli
(2, 6), -- Godfather - Klassik
(2, 8), -- Godfather - Mukofotli
(3, 6), -- Pulp Fiction - Klassik
(3, 2); -- Pulp Fiction - Mashhur
