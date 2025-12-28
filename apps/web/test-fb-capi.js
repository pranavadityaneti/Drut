import fetch from 'node-fetch';
import crypto from 'crypto';

const PIXEL_ID = '1629641061536935';
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

const TEST_EVENT_CODE = 'TEST2326';

async function testFacebookAPI() {
    console.log('Testing Facebook CAPI Direct Call...');

    if (!ACCESS_TOKEN) {
        console.error('Error: FACEBOOK_ACCESS_TOKEN is missing.');
        return;
    }

    const payload = {
        data: [
            {
                event_name: 'TestEvent',
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    em: [
                        // SHA256 of a test email
                        '7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068'
                    ],
                    client_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                custom_data: {
                    currency: 'USD',
                    value: 123.45,
                    prediction: 'We expect this to work!'
                }
            }
        ],
        test_event_code: TEST_EVENT_CODE
    };

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testFacebookAPI();
