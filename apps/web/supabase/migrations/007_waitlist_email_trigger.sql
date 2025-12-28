-- Migration: 007_waitlist_email_trigger.sql
-- Sends a welcome email when a new row is inserted into the waitlist table

-- 1. Enable HTTP extension (for calling Edge Functions)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Create the trigger function
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
  -- Build the Edge Function URL (replace with your actual Supabase project URL)
  edge_function_url := 'https://' || current_setting('app.settings.supabase_url', true) || '/functions/v1/send-waitlist-email';
  
  -- Fallback: If setting not available, use environment variable approach
  IF edge_function_url IS NULL OR edge_function_url = 'https:///functions/v1/send-waitlist-email' THEN
    edge_function_url := 'https://ukrtaerwaxekonislnpw.supabase.co/functions/v1/send-waitlist-email';
  END IF;

  -- Build the payload from the NEW row
  payload := jsonb_build_object(
    'email', NEW.email,
    'customerId', coalesce(NEW.customer_id, NEW.id::text),
    'name', coalesce(NEW.name, 'there'),
    'role', coalesce(NEW.role, 'Student'),
    'exam', coalesce(NEW.exam, 'JEE'),
    'phone', coalesce(NEW.phone, ''),
    'painPoint', coalesce(NEW.pain_point, '')
  );

  -- Make the HTTP POST request to the Edge Function
  -- Note: This uses the pg_net extension which is async
  -- For sync calls, use http extension
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

-- 3. Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_waitlist_insert ON public.waitlist;

-- 4. Create the trigger
CREATE TRIGGER on_waitlist_insert
  AFTER INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.send_waitlist_email();

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_waitlist_email() TO postgres, service_role;
