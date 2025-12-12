// Import Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase
const SUPABASE_URL = 'https://ukrtaerwaxekonislnpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8';


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Smooth scroll to waitlist
window.scrollToWaitlist = function () {
    document.getElementById('waitlist-1').scrollIntoView({ behavior: 'smooth' });
};

// Form submission handler
async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const messageDiv = form.querySelector('.form-message');
    const submitButton = form.querySelector('button[type="submit"]');

    // Get form data
    const formData = new FormData(form);
    const data = {
        name: formData.get('name') || null,
        email: formData.get('email'),
        exam_interest: formData.get('exam'),
        user_type: formData.get('user_type') || null,
        pain_point: formData.get('pain_point') || null,
        beta_access: formData.get('beta_access') === 'on',
        created_at: new Date().toISOString()
    };

    // Validate email
    if (!data.email || !isValidEmail(data.email)) {
        showMessage(messageDiv, 'Please enter a valid email address.', 'error');
        return;
    }

    if (!data.exam_interest) {
        showMessage(messageDiv, 'Please select an exam of interest.', 'error');
        return;
    }

    // Disable submit button
    const originalBtnText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Joining...';

    try {
        // Insert into Supabase
        const { error } = await supabase
            .from('waitlist')
            .insert([data]);

        if (error) {
            // Check if email already exists
            if (error.code === '23505') {
                showMessage(messageDiv, 'This email is already on the list!', 'success');
            } else {
                throw error;
            }
        } else {
            const successMsg = form.id === 'researchForm'
                ? '🎉 Thanks! You\'re on the panel. We\'ll be in touch.'
                : '🎉 Success! You\'re on the waitlist. Check your email soon!';
            showMessage(messageDiv, successMsg, 'success');
            form.reset();
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage(messageDiv, 'Something went wrong. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalBtnText;
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show form message
function showMessage(messageDiv, text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `form-message ${type}`;

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.className = 'form-message';
        }, 5000);
    }
}

// Attach form handlers
document.addEventListener('DOMContentLoaded', () => {
    const form1 = document.getElementById('waitlistForm1');
    const researchForm = document.getElementById('researchForm');

    if (form1) {
        form1.addEventListener('submit', handleFormSubmit);
    }

    if (researchForm) {
        researchForm.addEventListener('submit', handleFormSubmit);
    }
});
