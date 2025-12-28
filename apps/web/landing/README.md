# Drut Landing Page

A clean, minimalist waitlist landing page for Drut — the exam speed training platform.

## Features

- ✨ Feedly-inspired minimalist design
- 🎨 Green accent color palette (#00D084)
- 📱 Fully responsive (mobile, tablet, desktop)
- 🚀 Fast and lightweight (vanilla HTML/CSS/JS)
- 💾 Supabase-powered waitlist collection
- ✅ Form validation and user feedback

## Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase project:

```bash
# Copy the contents of waitlist_schema.sql and run it in your Supabase SQL editor
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 2. Configure Environment Variables

Update `script.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Local Development

Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Project Structure

```
landing/
├── index.html          # Main HTML structure
├── styles.css          # Design system and styles
├── script.js           # Form handling and Supabase integration
├── vercel.json         # Vercel deployment config
├── waitlist_schema.sql # Database schema
└── assets/
    ├── hero.png        # Hero illustration
    ├── step-1.png      # How it works - Step 1
    ├── step-2.png      # How it works - Step 2
    ├── step-3.png      # How it works - Step 3
    └── features.png    # Feature icons
```

## Design System

- **Primary Color**: #00D084 (Green)
- **Typography**: Inter (Google Fonts)
- **Layout**: Max-width 1200px, centered
- **Spacing**: 8px base unit
- **Border Radius**: 12px

## Sections

1. **Hero** - Main headline and CTAs
2. **Why This** - 3 key benefits
3. **Waitlist Form #1** - Mid-page signup
4. **How It Works** - 3-step process
5. **Core Features** - 4 feature cards
6. **Trust Section** - Validation and testimonials
7. **Waitlist Form #2** - Bottom signup
8. **Footer** - Legal and links

## License

© 2025 Drut. All rights reserved.
