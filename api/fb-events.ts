import type { VercelRequest, VercelResponse } from '@vercel/node';

const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.FACEBOOK_TEST_EVENT_CODE;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!PIXEL_ID || !ACCESS_TOKEN) {
        console.error('Missing Facebook Configuration');
        return res.status(500).json({ error: 'Server Configuration Error' });
    }

    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid payload: "events" array is required' });
        }

        // Add test_event_code if configured
        const eventsWithTestCode = events.map((event: any) => {
            // Ensure user_data is present
            const eventData = {
                ...event,
                action_source: event.action_source || 'website',
            };

            return eventData;
        });

        const payload = {
            data: eventsWithTestCode,
            ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
        };

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Facebook API Error:', JSON.stringify(data, null, 2));
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error processing server event:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
