-- Migration: 028_migrate_eamcet_users
-- Description: Migrate legacy 'eamcet' users to 'ap_eapcet' (defaulting to AP variant)

BEGIN;

-- 1. Update exam_profile (scalar value)
-- Replaces 'eamcet' with 'ap_eapcet'
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{exam_profile}', '"ap_eapcet"')
WHERE raw_user_meta_data->>'exam_profile' = 'eamcet';

-- 2. Update target_exams (array of strings)
-- Replaces any occurrence of 'eamcet' (case-insensitive) with 'ap_eapcet'
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{target_exams}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN lower(elem #>> '{}') = 'eamcet' THEN '"ap_eapcet"'::jsonb 
        ELSE elem 
      END
    )
    FROM jsonb_array_elements(raw_user_meta_data->'target_exams') elem
  )
)
WHERE raw_user_meta_data ? 'target_exams' 
  AND jsonb_typeof(raw_user_meta_data->'target_exams') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(raw_user_meta_data->'target_exams') elem
    WHERE lower(elem) = 'eamcet'
  );

COMMIT;
