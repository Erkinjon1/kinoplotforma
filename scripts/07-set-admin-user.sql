-- Erkinjon Rabbimov ni admin qilib belgilash

-- Avval mavjud profilni tekshirish
SELECT id, email, full_name, role, created_at 
FROM public.profiles 
WHERE email = 'erkinjonrabbimov1@gmail.com';

-- Agar profil mavjud bo'lsa, admin qilib belgilash
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'erkinjonrabbimov1@gmail.com';

-- Agar profil mavjud bo'lmasa, auth.users dan ma'lumotlarni olish va profil yaratish
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Auth.users dan foydalanuvchini topish
    SELECT id, email, raw_user_meta_data
    INTO user_record
    FROM auth.users 
    WHERE email = 'erkinjonrabbimov1@gmail.com';
    
    IF FOUND THEN
        -- Profil yaratish yoki yangilash (UPSERT)
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', 'Erkinjon Rabbimov'),
            'admin'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            updated_at = NOW();
            
        RAISE NOTICE 'Admin profil yaratildi yoki yangilandi: %', user_record.email;
    ELSE
        RAISE NOTICE 'Foydalanuvchi topilmadi: erkinjonrabbimov1@gmail.com';
        RAISE NOTICE 'Avval tizimga kiring, keyin bu skriptni qayta ishga tushiring';
    END IF;
END $$;

-- Natijani tekshirish
SELECT 
    p.id, 
    p.email, 
    p.full_name, 
    p.role, 
    p.created_at,
    p.updated_at,
    CASE 
        WHEN p.role = 'admin' THEN '✅ Admin huquqlari berildi'
        ELSE '❌ Admin huquqlari berilmadi'
    END as status
FROM public.profiles p
WHERE p.email = 'erkinjonrabbimov1@gmail.com';

-- Barcha adminlarni ko'rish
SELECT 
    email, 
    full_name, 
    role, 
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
