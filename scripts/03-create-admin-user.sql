-- Admin foydalanuvchi yaratish uchun script
-- Avval oddiy foydalanuvchi sifatida ro'yxatdan o'ting, keyin bu skriptni ishga tushiring

-- O'zingizning email manzilingizni kiriting
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com'; -- Bu yerga o'zingizning email manzilingizni yozing

-- Agar profil mavjud bo'lmasa, qo'lda yaratish (faqat test uchun)
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES (
--   gen_random_uuid(),
--   'admin@example.com',
--   'Admin User',
--   'admin'
-- );

-- Admin foydalanuvchilarni ko'rish
SELECT id, email, full_name, role, created_at 
FROM public.profiles 
WHERE role = 'admin';
