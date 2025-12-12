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
    const { email, customerId, name, role, exam, phone, painPoint, email_type } = await req.json();

    console.log(`NEW LEAD (${email_type}): ${email} (ID: ${customerId})`);
    console.log(`Details: ${name}, ${role}, ${exam}, ${phone}`);
    console.log(`Pain Point: ${painPoint}`);

    const firstName = name ? name.split(' ')[0] : 'there';

    let subject = 'Your Speed Journey Starts Now — Welcome to Drut';
    let emailHtml = '';

    if (email_type === 'research') {
      subject = 'Welcome to the Drut Research Panel';
      emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              .header { background: linear-gradient(90deg, #e8f5e9 0%, #c8e6c9 100%); padding: 24px; text-align: center; }
              .header h1 { margin: 0; color: #2e7d32; font-size: 24px; }
              .content { padding: 32px; line-height: 1.6; }
              .cta-box { margin-top: 24px; padding: 20px; background: #f1f8e9; border-left: 4px solid #4caf50; border-radius: 4px; }
              .footer { padding: 24px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Drut Research Panel</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Thanks for joining the Drut Research Panel.</p>
                <p>We are building the future of fast thinking for exams like <strong>${exam || 'competitive exams'}</strong>, and your insights are critical to us.</p>
                
                <div class="cta-box">
                  <h3 style="margin-top: 0; color: #2e7d32;">WHAT NEXT?</h3>
                  <p style="margin-bottom: 0;">Our founders will reach out to you on the communication details provided to personally schedule a 15-min discussion.</p>
                </div>
                
                <p>Cheers,<br>The Drut Team</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Drut. All rights reserved.<br>admin@drut.club</p>
              </div>
            </div>
          </body>
          </html>
        `;
    } else {
      // ... (Existing Waitlist Template) ...
      emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Drut</title>
        <style>
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f9f5; 
            -webkit-font-smoothing: antialiased;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: 16px; 
            overflow: hidden; 
            margin-top: 40px; 
            margin-bottom: 40px; 
            box-shadow: 0 4px 24px rgba(0,0,0,0.06); 
          }
          /* ... (Waitlist styles kept same for brevity in verification, user wants research mostly) */
          /* Header Section */
          .header { 
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            padding: 48px 32px 32px; 
            text-align: center; 
          }
          .header-tagline {
            font-size: 13px;
            font-weight: 600;
            color: #4CAF50;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
          }
          .header-title { 
            font-size: 32px; 
            font-weight: 800; 
            color: #1a1a1a; 
            line-height: 1.2;
            margin: 0;
          }
          
          /* Hero Image Section */
          .hero-image-container {
            background: linear-gradient(180deg, #f1f8e9 0%, #ffffff 100%);
            padding: 24px 32px 32px;
            text-align: center;
          }
          .hero-image {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
          }
          
          /* Sub-headline Section */
          .sub-headline {
            padding: 32px 40px;
            text-align: center;
            border-bottom: 1px solid #e8f5e9;
          }
          .sub-headline p {
            color: #333;
            font-size: 16px;
            line-height: 1.7;
            margin: 0;
          }
          .sub-headline .greeting {
            color: #4CAF50;
            font-weight: 600;
            margin-bottom: 12px;
          }
          
          /* Body Content Section */
          .content { 
            padding: 32px 40px; 
            color: #4a4a4a; 
            font-size: 15px; 
            line-height: 1.7; 
          }
          .content .intro-text {
            text-align: center;
            font-style: italic;
            color: #666;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #e8f5e9;
          }
          .content .features-intro {
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
          }
          .feature-list {
            list-style: none;
            padding: 0;
            margin: 0 0 24px 0;
          }
          .feature-list li {
            padding: 12px 0;
            padding-left: 32px;
            position: relative;
            border-bottom: 1px solid #f5f5f5;
          }
          .feature-list li:last-child {
            border-bottom: none;
          }
          .feature-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #4CAF50;
            font-weight: bold;
            font-size: 16px;
          }
          .feature-list .feature-title {
            font-weight: 600;
            color: #333;
          }
          .feature-list .feature-desc {
            color: #666;
            font-size: 14px;
          }
          .waitlist-confirmation {
            text-align: center;
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            padding: 20px;
            border-radius: 12px;
            margin-top: 24px;
          }
          .waitlist-confirmation p {
            margin: 0;
            color: #2e7d32;
            font-weight: 500;
          }
          
          /* CTA Section */
          .cta-section {
            padding: 32px 40px;
            text-align: center;
            background: #fafafa;
            border-top: 1px solid #e8f5e9;
          }
          .cta-title {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-bottom: 12px;
          }
          .cta-description {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .btn { 
            display: inline-block; 
            background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
            color: #ffffff; 
            text-decoration: none; 
            padding: 16px 40px; 
            border-radius: 50px; 
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transition: all 0.3s ease;
          }
          
          /* Footer Section */
          .footer { 
            padding: 32px 40px; 
            text-align: center; 
            background: #ffffff;
            border-top: 1px solid #e8f5e9;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 800;
            color: #4CAF50;
            margin-bottom: 8px;
          }
          .footer-logo span {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #4CAF50;
            border-radius: 50%;
            margin-right: 6px;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .container { margin: 20px 16px; border-radius: 12px; }
            .header { padding: 32px 24px 24px; }
            .header-title { font-size: 26px; }
            .sub-headline, .content, .cta-section, .footer { padding: 24px; }
            .btn { padding: 14px 32px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-tagline">Small Improvements. Big Results</div>
            <h1 class="header-title">Your Speed Journey Starts Now.</h1>
          </div>
          
          <!-- Hero Image -->
          <div class="hero-image-container">
            <img src="https://www.drut.club/assets/hero-email.png" alt="Drut Speed Training" class="hero-image" />
          </div>
          
          <!-- Sub-headline -->
          <div class="sub-headline">
            <p class="greeting">Thank you for joining the Drut waitlist.</p>
            <p>Drut helps you improve your problem-solving speed with adaptive practice and AI-guided feedback — so you get faster, confidently and consistently.</p>
          </div>
          
          <!-- Body Content -->
          <div class="content">
            <p class="intro-text">Timed practice with immediate feedback is scientifically proven to increase both speed and accuracy in competitive exams.</p>
            
            <p class="features-intro">Drut builds on this principle with:</p>
            
            <ul class="feature-list">
              <li>
                <span class="feature-title">Adaptive Sprints</span>
                <div class="feature-desc">that train and refine your pace</div>
              </li>
              <li>
                <span class="feature-title">Weak-spot Detection</span>
                <div class="feature-desc">that highlights exactly where you lose time</div>
              </li>
              <li>
                <span class="feature-title">Instant AI Feedback</span>
                <div class="feature-desc">that helps you improve with every session</div>
              </li>
            </ul>
            
            <div class="waitlist-confirmation">
              <p>🎉 You're officially on the waitlist — we'll notify you as soon as early access opens.</p>
            </div>
          </div>
          
          <!-- CTA Section -->
          <div class="cta-section">
            <div class="cta-title">Share Your Feedback</div>
            <p class="cta-description">Schedule a 15-min LIVE demo with the founder to explore Drut, understand how it works, and share your feedback directly.</p>
            <a href="https://drut.zohobookings.in/#/LivePreview" class="btn">Book a 15-min Call</a>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo"><span></span>Drut</div>
          </div>
        </div>
      </body>
      </html>
    `;
    }

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
          from: 'Drut <admin@drut.club>',
          to: email,
          subject: subject,
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
