import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PHONE_AUTH_SECRET = Deno.env.get('PHONE_AUTH_SECRET') || 'drut-phone-auth-v1';

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) return '91' + cleaned;
  return cleaned;
}

async function derivePassword(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone + ':' + PHONE_AUTH_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Find a user by email across all paginated pages of auth.admin.listUsers.
 * Returns the user object or null if not found.
 */
async function findUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1;
  const perPage = 100;
  while (page <= 20) { // search up to 2000 users
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    const users = data?.users || [];
    if (users.length === 0) return null;
    const found = users.find((u: any) => u.email === email);
    if (found) return found;
    if (users.length < perPage) return null; // last page
    page++;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalized = normalizePhone(phone);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // ===== Step 1: Verify OTP =====
    const { data: otpRows, error: otpError } = await supabaseAdmin
      .from('phone_otps')
      .select('*')
      .eq('phone', normalized)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .eq('verified', false)
      .limit(1);

    if (otpError) {
      console.error('OTP query error:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP', detail: otpError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpRows || otpRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from('phone_otps')
      .update({ verified: true })
      .eq('id', otpRows[0].id);

    // ===== Step 2: Get or create user =====
    const password = await derivePassword(normalized);
    const email = `${normalized}@phone.drut.club`;

    // Try sign-in first (existing user, password matches)
    let signInResult = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (signInResult.data?.session) {
      return new Response(
        JSON.stringify({
          success: true,
          session: signInResult.data.session,
          user: signInResult.data.user,
          isNewUser: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sign-in failed — try to create a new user
    const createResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        login_method: 'whatsapp_otp',
        phone_number: normalized,
      },
    });

    if (createResult.data?.user) {
      // New user created — sign in
      const newSignIn = await supabaseAnon.auth.signInWithPassword({ email, password });
      if (newSignIn.data?.session) {
        return new Response(
          JSON.stringify({
            success: true,
            session: newSignIn.data.session,
            user: newSignIn.data.user,
            isNewUser: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('New user created but sign-in failed:', newSignIn.error);
      return new Response(
        JSON.stringify({ error: 'Account created but sign-in failed', detail: newSignIn.error?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create failed — likely because user already exists with a different password
    // (e.g. user was created via client-side signup earlier)
    const createErrorMsg = (createResult.error?.message || '').toLowerCase();
    const userExists = createErrorMsg.includes('already') ||
                       createErrorMsg.includes('exists') ||
                       createErrorMsg.includes('registered') ||
                       createErrorMsg.includes('duplicate');

    if (userExists) {
      // Find the user and reset their password to our derived one
      const existingUser = await findUserByEmail(supabaseAdmin, email);
      if (!existingUser) {
        console.error('User reported to exist but findUserByEmail returned null. email=', email);
        return new Response(
          JSON.stringify({ error: 'Account exists but could not be located. Contact support.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reset password
      const updateResult = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
      });
      if (updateResult.error) {
        console.error('Failed to reset password:', updateResult.error);
        return new Response(
          JSON.stringify({ error: 'Could not reset account password', detail: updateResult.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Now sign in
      const retrySignIn = await supabaseAnon.auth.signInWithPassword({ email, password });
      if (retrySignIn.data?.session) {
        return new Response(
          JSON.stringify({
            success: true,
            session: retrySignIn.data.session,
            user: retrySignIn.data.user,
            isNewUser: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Sign-in failed after password reset:', retrySignIn.error);
      return new Response(
        JSON.stringify({ error: 'Sign-in failed after password reset', detail: retrySignIn.error?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown error
    console.error('Unknown create user error:', createResult.error);
    return new Response(
      JSON.stringify({ error: 'Failed to create account', detail: createResult.error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-whatsapp-otp uncaught:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
