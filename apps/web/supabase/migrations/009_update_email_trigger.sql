-- Update the trigger function to include user_type and pain_point
CREATE OR REPLACE FUNCTION public.send_waitlist_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
  response RECORD;
  email_type TEXT;
BEGIN
  -- Build the Edge Function URL
  edge_function_url := 'https://ukrtaerwaxekonislnpw.supabase.co/functions/v1/send-waitlist-email';

  -- Determine email type based on data
  IF NEW.user_type IS NOT NULL THEN
    email_type := 'research';
  ELSE
    email_type := 'waitlist';
  END IF;

  -- Build the payload with new fields
  payload := jsonb_build_object(
    'email', NEW.email,
    'customerId', NEW.id::text,
    'name', coalesce(NEW.name, 'there'),
    'exam', coalesce(NEW.exam_interest, 'General'),
    'user_type', NEW.user_type,
    'pain_point', NEW.pain_point,
    'email_type', email_type
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
