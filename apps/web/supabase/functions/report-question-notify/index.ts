// report-question-notify — sends an email to support@drut.club whenever a
// new row is inserted into public.question_reports.
//
// Configured as a Supabase Database Webhook:
//   Dashboard → Database → Webhooks → Create new
//     Table:     question_reports
//     Events:    INSERT
//     URL:       https://<project>.supabase.co/functions/v1/report-question-notify
//     Headers:   Authorization: Bearer <SERVICE_ROLE>   (so the function can read user info)
//
// Payload shape from Supabase DB webhook:
//   {
//     type: 'INSERT',
//     table: 'question_reports',
//     schema: 'public',
//     record: { ... new row ... },
//     old_record: null
//   }
//
// SENDS EMAIL VIA RESEND (https://resend.com — generous free tier, easy DNS).
// Why Resend over SES/Postmark: Resend has the simplest "from a verified
// drut.club address" setup and a 100/day free tier — more than enough for
// beta-level report volume. Swap to a different provider just by changing
// the fetch call below.
//
// ENV REQUIRED:
//   RESEND_API_KEY  — from resend.com dashboard
//   REPORT_TO_EMAIL — defaults to support@drut.club
//   REPORT_FROM_EMAIL — defaults to alerts@drut.club (must be a verified Resend sender)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') || '';
const REPORT_TO_EMAIL       = Deno.env.get('REPORT_TO_EMAIL')   || 'support@drut.club';
const REPORT_FROM_EMAIL     = Deno.env.get('REPORT_FROM_EMAIL') || 'alerts@drut.club';

interface DbWebhookPayload {
    type:   'INSERT' | 'UPDATE' | 'DELETE';
    table:  string;
    schema: string;
    record: {
        id:           string;
        user_id:      string | null;
        question_id:  string;
        category:     'wrong-answer' | 'typo' | 'unclear' | 'other';
        message:      string | null;
        status:       string;
        exam_profile: string | null;
        subject:      string | null;
        client:       string | null;
        created_at:   string;
    };
    old_record: null;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')    return new Response('method-not-allowed', { status: 405, headers: corsHeaders });

    let payload: DbWebhookPayload;
    try {
        payload = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'invalid-json' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (payload.type !== 'INSERT' || payload.table !== 'question_reports') {
        return new Response(JSON.stringify({ ignored: 'wrong-event' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const r = payload.record;

    // Look up the reporting user's email (best-effort).
    let reporterEmail = '(anonymous)';
    if (r.user_id) {
        try {
            const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
            const { data } = await sb.auth.admin.getUserById(r.user_id);
            if (data?.user?.email) reporterEmail = data.user.email;
        } catch {
            // best-effort — don't fail the notification
        }
    }

    // Look up the question text (so triage email is self-contained).
    let questionPreview = '(question not found)';
    try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        const { data: q } = await sb
            .from('cached_questions')
            .select('question_data')
            .eq('id', r.question_id)
            .single();
        const text = q?.question_data?.questionText || q?.question_data?.text;
        if (text) questionPreview = text.slice(0, 400);
    } catch {
        // best-effort
    }

    const subject = `[Drut report] ${r.category} — ${r.subject || 'unknown subject'}`;
    const adminLink = 'https://admin.drut.club/admin?tab=reports';

    const html = `
<!doctype html>
<html><body style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.5;color:#1c1d1a;">
  <h2 style="margin:0 0 16px;">New question report</h2>
  <table style="border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Category</td><td><strong>${escapeHtml(r.category)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Subject</td><td>${escapeHtml(r.subject || '—')}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Exam</td><td>${escapeHtml(r.exam_profile || '—')}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Client</td><td>${escapeHtml(r.client || '—')}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Reporter</td><td>${escapeHtml(reporterEmail)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Question ID</td><td><code>${escapeHtml(r.question_id)}</code></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Report ID</td><td><code>${escapeHtml(r.id)}</code></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#5c5e57;">Submitted</td><td>${escapeHtml(r.created_at)}</td></tr>
  </table>

  ${r.message ? `<h3 style="margin:20px 0 6px;">User message</h3><blockquote style="margin:0;padding:10px 14px;border-left:3px solid #5cbb21;background:#f7f7f5;border-radius:4px;">${escapeHtml(r.message)}</blockquote>` : ''}

  <h3 style="margin:20px 0 6px;">Question preview</h3>
  <blockquote style="margin:0;padding:10px 14px;border-left:3px solid #ddd;background:#f7f7f5;border-radius:4px;font-size:13px;">${escapeHtml(questionPreview)}</blockquote>

  <p style="margin-top:24px;"><a href="${adminLink}" style="display:inline-block;padding:10px 16px;background:#5cbb21;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open in admin</a></p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
        // Don't fail the webhook — just log. Pranav sees this in fn logs and
        // can add the key when ready. The report row is still saved.
        console.warn('[report-question-notify] RESEND_API_KEY not set, skipping email send', { report_id: r.id });
        return new Response(JSON.stringify({ ok: true, email_sent: false, reason: 'no-api-key' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:    REPORT_FROM_EMAIL,
            to:      [REPORT_TO_EMAIL],
            reply_to: reporterEmail !== '(anonymous)' ? reporterEmail : undefined,
            subject,
            html,
        }),
    });

    if (!resendResp.ok) {
        const errText = await resendResp.text();
        console.error('[report-question-notify] resend failed', resendResp.status, errText);
        // Still 200 OK — we don't want Supabase webhook to retry indefinitely.
        return new Response(JSON.stringify({ ok: true, email_sent: false, error: errText.slice(0, 300) }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ ok: true, email_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
