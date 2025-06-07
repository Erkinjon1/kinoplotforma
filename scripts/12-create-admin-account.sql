-- Admin akkaunt yaratish uchun
-- Avval oddiy foydalanuvchi sifatida ro'yxatdan o'ting, keyin bu skriptni ishga tushiring

-- 1. Sizning email manzilingizni admin qilish
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com'; -- Bu yerga o'zingizning emailingizni yozing

-- 2. Barcha adminlarni ko'rish
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- 3. Test admin yaratish (faqat development uchun)
-- Bu faqat test uchun, real projectda ishlatmang!
/*
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Yangi UUID yaratish
    new_user_id := gen_random_uuid();
    
    -- Profile yaratish
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new_user_id,
        'admin@test.com',
        'Test Admin',
        'admin'
    );
    
    RAISE NOTICE 'Test admin yaratildi: %', new_user_id;
END $$;
*/

-- 4. Foydalanuvchi statistikasi
SELECT 
    role,
    COUNT(*) as count,
    MIN(created_at) as first_user,
    MAX(created_at) as last_user
FROM public.profiles
GROUP BY role
ORDER BY role;
