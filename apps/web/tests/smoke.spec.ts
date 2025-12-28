
/*
 * PLAYWRIGHT SMOKE TESTS
 * 
 * How to run:
 * 1. Install Playwright: `npm install -D @playwright/test`
 * 2. Configure playwright.config.ts to point to your development server URL.
 * 3. Run the tests: `npx playwright test`
 *
 * These tests verify the core user flows under different conditions.
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000'; // Or your app's URL

test.describe('Drut Smoke Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Log in before each test. Assumes a test user exists.
    // For this test, we simulate it by setting localStorage.
    await page.goto(APP_URL);
    await page.evaluate(() => {
        const user = { 
            id: 'test-user-id', 
            email: 'test@example.com',
            // Add other required user properties
        };
        localStorage.setItem('supabase.auth.token', JSON.stringify({
            currentSession: { user },
            expiresAt: Date.now() + 3600 * 1000,
        }));
    });
    await page.reload();
  });

  test('Test A: No Gemini Key', async ({ page }) => {
    // This test assumes the API_KEY environment variable is NOT set when running the app
    
    // 1. Dashboard should render correctly
    await page.goto(APP_URL);
    await expect(page.getByRole('heading', { name: 'Your Preferences' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Performance Analytics' })).toBeVisible();

    // 2. Navigate to Practice page
    await page.getByRole('button', { name: 'Practice' }).click();

    // 3. See "key missing" message
    // The test relies on the specific error message from geminiService.ts
    await expect(page.getByText('Error: Gemini API key is missing.')).toBeVisible();
  });


  test('Test B: With Gemini Key', async ({ page }) => {
    // This test assumes the API_KEY environment variable IS set
    
    // 1. Navigate to Practice page
    await page.goto(APP_URL);
    await page.getByRole('button', { name: 'Practice' }).click();

    // 2. A question should be generated and visible
    await expect(page.getByRole('heading', { name: 'Question' })).toBeVisible({ timeout: 15000 }); // Generative AI can be slow
    
    // 3. Submit an answer and see the solution view with "Fastest Safe Method"
    // Click the first option
    await page.locator('label').first().click();
    await page.getByRole('button', { name: 'Submit Answer' }).click();

    // The solution view should now be visible
    await expect(page.getByRole('heading', { name: 'Solutions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fastest Safe Method' })).toBeVisible();
  });
});