import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const WATI_API_KEY = Deno.env.get('WATI_API_KEY')!;
const WATI_API_URL = Deno.env.get('WATI_API_URL') || 'https://live-mt-server.wati.io';

// Test number that always gets OTP 123456 (no WhatsApp sent)
const TEST_NUMBERS: Record<string, string> = {
  '9959777027': '123456',
  '919959777027': '123456',
  '+919959777027': '123456',
};

function normalizePhone(phone: string): string {
  // Strip spaces, dashes, parens
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Ensure starts with country code
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(1); // remove +, keep 91
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) return '91' + cleaned;
  return cleaned;
}

function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalized = normalizePhone(phone);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate OTP (use test OTP for test numbers)
    const isTestNumber = Object.keys(TEST_NUMBERS).some(
      t => normalizePhone(t) === normalized
    );
    const otp = isTestNumber ? '123456' : generateOTP();

    // Delete any existing OTPs for this phone
    await supabaseAdmin
      .from('phone_otps')
      .delete()
      .eq('phone', normalized);

    // Store OTP with 10-minute expiry (matches WhatsApp template footer)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin
      .from('phone_otps')
      .insert({ phone: normalized, otp, expires_at: expiresAt });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via WATI WhatsApp API (skip for test numbers)
    if (!isTestNumber) {
      try {
        // Send template message via WATI
        // The template should have a parameter for the OTP code
        const watiResponse = await fetch(
          `${WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber=${normalized}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WATI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template_name: 'otp_verification',
              broadcast_name: 'drut_otp',
              // For Authentication-category templates with {{1}}, the parameter
              // name is the positional index "1", not a named field.
              parameters: [{ name: '1', value: otp }],
            }),
          }
        );

        if (!watiResponse.ok) {
          const watiError = await watiResponse.text();
          console.error('WATI API error:', watiError);
          // Don't fail the request — OTP is stored, user can retry
          // In production, you'd want to handle this more gracefully
        }
      } catch (watiErr) {
        console.error('WATI API call failed:', watiErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isTestNumber
          ? 'Test OTP generated'
          : 'OTP sent via WhatsApp',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-whatsapp-otp error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
