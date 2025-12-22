/**
 * Service to handle Facebook Conversions API events
 */

// Define standard FB Event parameters
export interface FBEventUser {
    em?: string; // hashed email
    ph?: string; // hashed phone
    fn?: string; // hashed first name
    ln?: string; // hashed last name
    ct?: string; // hashed city
    st?: string; // hashed state
    zp?: string; // hashed zip
    country?: string; // hashed country
    client_user_agent?: string;
    client_ip_address?: string;
    fbc?: string;
    fbp?: string;
    external_id?: string;
}

export interface FBCustomData {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
    [key: string]: any;
}

export interface FBEvent {
    event_name: string;
    event_time?: number;
    event_id?: string;
    event_source_url?: string;
    action_source?: 'website' | 'email' | 'app' | 'chat' | 'other';
    user_data?: FBEventUser;
    custom_data?: FBCustomData;
}

const hashString = async (text: string): Promise<string> => {
    if (!text) return '';
    const encoder = new TextEncoder();
    const data = encoder.encode(text.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const FacebookPixelService = {
    /**
     * Hashes user data fields for privacy compliance (SHA-256)
     */
    async hashUserData(userData: FBEventUser): Promise<FBEventUser> {
        const hashed: FBEventUser = { ...userData };
        const hashFields: (keyof FBEventUser)[] = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country'];

        for (const field of hashFields) {
            if (hashed[field]) {
                hashed[field] = await hashString(hashed[field] as string);
            }
        }
        return hashed;
    },

    /**
     * Send an event to the server-side API (which forwards to Facebook CAPI)
     */
    async trackServerEvent(eventName: string, customData: FBCustomData = {}, userData: FBEventUser = {}, eventId?: string) {
        try {
            // Basic client-side data
            const finalUserData: FBEventUser = {
                client_user_agent: navigator.userAgent,
                ...userData
            };

            // Auto-hash specific fields if they are plain text
            // Note: In a real app, you might want to confirm if data is already hashed.
            // Here we assume if it looks like an email, we hash it.
            if (finalUserData.em && finalUserData.em.includes('@')) {
                const toHash = { ...finalUserData };
                // For now, implementing simple hashing call 
                // In production, ensure you don't double hash
                const processed = await this.hashUserData(toHash);
                Object.assign(finalUserData, processed);
            }

            const event: FBEvent = {
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                event_source_url: window.location.href,
                action_source: 'website',
                user_data: finalUserData,
                custom_data: customData,
                event_id: eventId || crypto.randomUUID(), // Deduplication ID
            };

            const response = await fetch('/api/fb-events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ events: [event] }),
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('Failed to send FB server event:', err);
            } else {
                // console.log('FB server event sent:', eventName);
            }
        } catch (error) {
            console.error('Error sending FB server event:', error);
        }
    },

    /**
     * Helper for Standard Events
     */
    trackPageView() {
        return this.trackServerEvent('PageView');
    },

    trackLead(userData?: FBEventUser, value?: number) {
        return this.trackServerEvent('Lead', { value, currency: 'USD' }, userData);
    },

    trackPurchase(userData: FBEventUser, amount: number, currency: string = 'USD') {
        return this.trackServerEvent('Purchase', { value: amount, currency }, userData);
    },

    trackInitiateCheckout(userData?: FBEventUser) {
        return this.trackServerEvent('InitiateCheckout', {}, userData);
    }
};
