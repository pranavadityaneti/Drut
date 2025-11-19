
// Vercel serverless function
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Check for standard API_KEY first (Gemini)
  const aiConfigured = !!process.env.API_KEY || !!process.env.OPENAI_API_KEY;
  return res.status(200).json({
    ok: aiConfigured,
    ai: aiConfigured ? 'configured' : 'missing_key',
  });
}
