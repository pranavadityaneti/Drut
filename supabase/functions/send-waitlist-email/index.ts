import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, customerId, name, role, exam, phone, painPoint } = await req.json();

    console.log(`NEW LEAD: ${email} (ID: ${customerId})`);
    console.log(`Details: ${name}, ${role}, ${exam}, ${phone}`);
    console.log(`Pain Point: ${painPoint}`);

    const firstName = name ? name.split(' ')[0] : 'there';

    // Headspace-style Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #fceecb; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background-color: #ffd600; padding: 40px 20px; text-align: center; position: relative; }
          
          /* The "Headspace" Sun Graphic */
          .sun-graphic {
            width: 120px;
            height: 60px;
            background: #ff9d00;
            border-radius: 120px 120px 0 0;
            margin: 20px auto 0;
            position: relative;
          }
          .sun-graphic::after {
             content: '';
             position: absolute;
             bottom: 10px;
             left: 50%;
             transform: translateX(-50%);
             width: 40px;
             height: 20px;
             border-bottom: 3px solid #333;
             border-radius: 0 0 20px 20px;
          }

          .logo { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .hero-text { font-size: 28px; font-weight: 800; color: #1a1a1a; margin-top: 10px; line-height: 1.2; }
          
          .content { padding: 40px 30px; text-align: center; color: #4a4a4a; font-size: 16px; line-height: 1.6; }
          .unique-id-box { background: #fff8e1; border: 1px dashed #ffd600; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0; font-family: monospace; font-size: 18px; color: #333; letter-spacing: 1px; font-weight: bold; }
          
          .btn { display: inline-block; background-color: #ff9d00; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; margin-top: 20px; }
          .btn:hover { background-color: #e68a00; }
          
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">● Drut.</div>
            <div class="hero-text">Welcome to the<br>Speed-First Era.</div>
            <div class="sun-graphic"></div>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Studies have shown that reflexes beat memorization in competitive exams. You've taken the first step to mastering your speed.</p>
            
            <div class="unique-id-box">#${customerId}</div>
            
            <p>You are now on the official waitlist. We will notify you when your cohort opens.</p>
            
            <a href="#" class="btn">Check Your Position</a>
          </div>
          <div class="footer">
            <p>© 2025 Drut Learning Technologies.<br>Sent with love from our Speed Labs.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Try sending with Resend if Key exists
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Drut <onboarding@resend.dev>', // Default Resend input, user should configure domain
          to: email,
          subject: 'Welcome to the Speed-First Era',
          html: emailHtml
        })
      });
      const data = await res.json();
      console.log('Resend response:', data);
    } else {
      console.log('No RESEND_API_KEY found. Skipping actual email send.');
    }

    // Response
    return new Response(JSON.stringify({ success: true, message: 'Email queued', preview: emailHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
