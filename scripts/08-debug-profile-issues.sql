-- Profil muammolarini aniqlash va tuzatish

-- 1. Auth.users va profiles o'rtasidagi farqni tekshirish
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'public.profiles' as table_name,
    COUNT(*) as count
FROM public.profiles;

-- 2. Auth.users da mavjud lekin profiles da yo'q bo'lgan foydalanuvchilar
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    'Missing in profiles' as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3. Erkinjon uchun maxsus tekshiruv
SELECT 
    'auth.users' as source,
    id,
    email,
    created_at,
    raw_user_meta_data->>'full_name' as full_name_meta
FROM auth.users 
WHERE email = 'erkinjonrabbimov1@gmail.com'
UNION ALL
SELECT 
    'profiles' as source,
    id::text,
    email,
    created_at,
    full_name
FROM public.profiles 
WHERE email = 'erkinjonrabbimov1@gmail.com';

-- 4. Trigger funksiyasini tekshirish
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. RLS policylarini tekshirish
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Barcha adminlarni ko'rsatish
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
