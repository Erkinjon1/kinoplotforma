-- Majburiy admin profil yaratish (agar yuqoridagi skriptlar ishlamasa)

-- Avval mavjud profilni o'chirish (agar noto'g'ri yaratilgan bo'lsa)
DELETE FROM public.profiles WHERE email = 'erkinjonrabbimov1@gmail.com';

-- Auth.users dan ma'lumotlarni olish va to'g'ri profil yaratish
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Erkinjon Rabbimov') as full_name,
    'admin' as role,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
WHERE au.email = 'erkinjonrabbimov1@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();

-- Natijani tekshirish
SELECT 
    'SUCCESS: Admin profil yaratildi' as message,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE email = 'erkinjonrabbimov1@gmail.com' AND role = 'admin';

-- Agar hali ham topilmasa
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'erkinjonrabbimov1@gmail.com' AND role = 'admin') THEN
        RAISE NOTICE '❌ XATOLIK: Admin profil yaratilmadi!';
        RAISE NOTICE 'Iltimos quyidagi amallarni bajaring:';
        RAISE NOTICE '1. erkinjonrabbimov1@gmail.com email bilan tizimga kiring';
        RAISE NOTICE '2. Profil yaratilganini kutib turing';
        RAISE NOTICE '3. Bu skriptni qayta ishga tushiring';
    ELSE
        RAISE NOTICE '✅ SUCCESS: Admin profil muvaffaqiyatli yaratildi!';
    END IF;
END $$;
