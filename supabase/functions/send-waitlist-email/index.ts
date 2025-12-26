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
    const { email, customerId, name, user_type, exam, phone, pain_point, email_type } = await req.json();

    console.log(`NEW LEAD (${email_type}): ${email} (ID: ${customerId})`);
    console.log(`Details: ${name}, ${user_type}, ${exam}, ${phone}`);
    console.log(`Pain Point: ${pain_point}`);

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
            <title>Welcome to Drut</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
              
              /* Header Blue (Drut Green now) */
              .header { 
                background-color: #4CAF50; 
                padding: 40px 0; 
                text-align: center;
                position: relative;
              }
              
              /* Hero illustration area */
              .hero-img {
                display: block;
                margin: 0 auto;
                max-width: 100%;
                /* Placeholder style if no image */
                width: 600px;
                height: 320px;
                background-color: #4CAF50;
                object-fit: cover;
              }
              
              .content { padding: 40px; text-align: left; }
              
              .title { 
                font-size: 24px; 
                font-weight: 800; 
                color: #ffffff; 
                margin: 0; 
                text-transform: uppercase; 
                letter-spacing: 1px;
                position: absolute;
                bottom: 40px;
                left: 0; right: 0;
                text-align: center;
              }

              .greeting {
                font-weight: 700;
                font-size: 18px;
                color: #111;
                margin-bottom: 16px;
              }
              
              .text {
                font-size: 15px;
                line-height: 1.6;
                color: #555;
                margin-bottom: 16px;
              }
              
              .list {
                margin: 24px 0;
                padding-left: 20px;
              }
              .list li {
                margin-bottom: 10px;
                color: #555;
                font-size: 15px;
                line-height: 1.5;
              }

              .btn {
                display: block;
                width: fit-content;
                margin: 32px auto 0;
                background-color: #4CAF50;
                color: #ffffff;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 15px;
                text-align: center;
              }
              
              .footer { 
                background-color: #fafafa; 
                padding: 30px; 
                text-align: center; 
                color: #999; 
                font-size: 12px; 
                border-top: 1px solid #eee; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              
              <!-- Imitating the reference style: Main bold header area -->
              <div style="background-color: #4CAF50; text-align: center;">
                 <!-- If user provides image, replace src. Using placeholder for now. -->
                 <!-- White/Blue style reference implies image blends with bg. -->
                 <div style="padding: 40px 0;">
                     <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: 1px;">WELCOME!</h1>
                 </div>
              </div>

              <div class="content">
                <div class="greeting">Hi ${firstName},</div>
                
                <div class="text">
                  Drut provides adaptive practice for exams like <strong>${exam || 'competitive exams'}</strong>.
                  We are excited to have you on our Research Panel.
                </div>

                <div class="text">
                  Here is what you can expect next:
                </div>

                <ul class="list">
                  <li>• A short 15-min chat with our founders to understand your study patterns.</li>
                  <li>• Early access to our speed-training modules.</li>
                  <li>• Exclusive updates on new features and tools.</li>
                </ul>

                <div class="text">
                  Click the button below if you want to schedule your chat right away.
                </div>

                <a href="https://drut.zohobookings.in/#/LivePreview" class="btn">Schedule Chat</a>
              </div>
              
              <div class="footer">
                &copy; 2025 Drut. All rights reserved.<br>
                <a href="#" style="color: #999; text-decoration: underline;">Unsubscribe</a>
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
    const ADMIN_EMAIL = 'pranav.n@drut.club';

    if (RESEND_API_KEY) {
      // 1. Send confirmation email to user
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
      console.log('Resend response (user email):', data);

      // 2. Send admin notification email
      const adminSubject = email_type === 'research'
        ? `🔬 New Research Panel Signup: ${name || email}`
        : `🎉 New Waitlist Signup: ${email}`;

      // Different templates for waitlist vs research panel
      let adminEmailHtml = '';

      if (email_type === 'research') {
        // Full template for Research Panel with all details
        adminEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
              .header { border-bottom: 2px solid #1976D2; padding-bottom: 16px; margin-bottom: 24px; }
              .header h1 { color: #1976D2; margin: 0; font-size: 24px; }
              .header .type-badge { display: inline-block; background: #E3F2FD; color: #1976D2; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
              .field { margin-bottom: 16px; }
              .field-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
              .field-value { font-size: 16px; color: #333; }
              .pain-point { background: #f9f9f9; padding: 16px; border-radius: 8px; border-left: 4px solid #1976D2; margin-top: 8px; }
              .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
              .timestamp { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Research Panelist 🔬</h1>
                <div class="type-badge">Research Panel</div>
              </div>
              
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${name || 'Not provided'}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
              </div>
              
              <div class="field">
                <div class="field-label">User Type</div>
                <div class="field-value">${user_type || 'Not specified'}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Target Exam</div>
                <div class="field-value">${exam || 'Not specified'}</div>
              </div>
              
              ${phone ? `
              <div class="field">
                <div class="field-label">Phone</div>
                <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
              </div>
              ` : ''}
              
              <div class="field">
                <div class="field-label">What Slows Them Down</div>
                <div class="pain-point">${pain_point || 'Not specified'}</div>
              </div>
              
              <div class="footer">
                <div class="timestamp">Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                <div>Lead ID: ${customerId || email}</div>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        // Minimal template for Quick Waitlist Signup (email only)
        adminEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
              .header { border-bottom: 2px solid #4CAF50; padding-bottom: 16px; margin-bottom: 24px; }
              .header h1 { color: #4CAF50; margin: 0; font-size: 24px; }
              .header .type-badge { display: inline-block; background: #E8F5E9; color: #2E7D32; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
              .email-highlight { font-size: 20px; color: #333; background: #f5f5f5; padding: 16px 20px; border-radius: 8px; margin: 16px 0; }
              .email-highlight a { color: #4CAF50; text-decoration: none; }
              .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
              .timestamp { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Waitlist Signup 🎉</h1>
                <div class="type-badge">Quick Signup</div>
              </div>
              
              <div class="email-highlight">
                <a href="mailto:${email}">${email}</a>
              </div>
              
              <div class="footer">
                <div class="timestamp">Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      const adminRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Drut Alerts <admin@drut.club>',
          to: ADMIN_EMAIL,
          subject: adminSubject,
          html: adminEmailHtml
        })
      });
      const adminData = await adminRes.json();
      console.log('Resend response (admin notification):', adminData);
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
