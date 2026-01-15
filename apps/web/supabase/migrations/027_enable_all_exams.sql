-- Migration: 027_enable_all_exams
-- Description: Enable all exams for user 'pranav.n@ideaye.in' by updating auth.users metadata

DO $$
DECLARE
  target_email TEXT := 'pranav.n@ideaye.in';
BEGIN
  -- Update auth.users directly (requires postgres role or similar high privileges)
  -- We update 'raw_user_meta_data' JSONB column
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{target_exams}',
    '["CAT", "JEE Main", "AP EAPCET", "TG EAPCET", "MHT CET", "WBJEE", "KCET", "GUJCET", "JEE Advanced"]'::jsonb
  )
  WHERE email = target_email;
  
  IF FOUND THEN
      RAISE NOTICE 'Updated metadata for %', target_email;
  ELSE
      RAISE WARNING 'User % not found in auth.users', target_email;
  END IF;
END $$;
