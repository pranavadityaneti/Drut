-- Fix for waitlist email trigger
-- The trigger was referencing columns that don't exist in the waitlist table
-- Run this in Supabase SQL Editor to fix

-- 1. Update the trigger function to use correct column names
CREATE OR REPLACE FUNCTION public.send_waitlist_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
  response RECORD;
BEGIN
  -- Build the Edge Function URL
  edge_function_url := 'https://ukrtaerwaxekonislnpw.supabase.co/functions/v1/send-waitlist-email';

  -- Build the payload from the NEW row using ACTUAL column names
  payload := jsonb_build_object(
    'email', NEW.email,
    'customerId', NEW.id::text,
    'name', coalesce(NEW.name, 'there'),
    'exam', coalesce(NEW.exam_interest, 'General')
  );

  -- Make the HTTP POST request to the Edge Function
  BEGIN
    SELECT * INTO response FROM extensions.http((
      'POST',
      edge_function_url,
      ARRAY[
        extensions.http_header('Content-Type', 'application/json'),
        extensions.http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
      ],
      'application/json',
      payload::text
    )::extensions.http_request);
    
    RAISE LOG 'Waitlist email trigger response: %', response;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the insert if email sending fails
    RAISE LOG 'Waitlist email trigger error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 2. If you want to DISABLE the trigger temporarily (inserts will work, no email sent):
-- DROP TRIGGER IF EXISTS on_waitlist_insert ON public.waitlist;

-- 3. Or re-create the trigger with the fixed function:
DROP TRIGGER IF EXISTS on_waitlist_insert ON public.waitlist;
CREATE TRIGGER on_waitlist_insert
  AFTER INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.send_waitlist_email();
