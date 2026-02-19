# Project Migration Guide

> **Goal**: Move the **Drut** project to a new laptop without losing data or context.

## 1. What is Saved (In Git)
*   ✅ All source code (Next.js, Expo, Supabase)
*   ✅ Project documentation (`docs/runpod_integration.md`, `docs/current_task_state.md`)
*   ✅ Git history and branches

## 2. What is NOT Saved (Local Secrets)
*   ⚠️ **Environment Variables**: Files like `apps/web/.env.local` containing API keys (Supabase, Gemini, Facebook Pixel) are **ignored by git** for security.
*   ⚠️ **Node Modules**: `node_modules` folders are ignored (you will reinstall them).
*   ⚠️ **Build Artifacts**: `.next`, `.expo`, `dist` folders.

---

## 3. How to Transfer Secrets (Risk: High)

Since you cannot push `.env` files to a public/shared git repo safely, use this script to package your secrets into a zip file.

### Step A: On Old Laptop (Run this now)
1.  Open your terminal in the project root (`/Users/apple/Durt/Drut`).
2.  Run this command to create a secrets backup:

```bash
# Create a zip of all .env files (ignoring node_modules)
zip -r secrets_backup.zip . -i "**/.env*"
```

3.  **Action**: Email `secrets_backup.zip` to yourself or save it to a USB/Drive.

### Step B: On New Laptop
1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/pranavadityaneti/Drut.git
    cd Drut
    ```

2.  **Restore Secrets**:
    *   Place `secrets_backup.zip` in the `Drut` folder.
    *   Unzip it: `unzip secrets_backup.zip`

3.  **Install Dependencies**:
    ```bash
    # Install root dependencies (assuming monorepo/yarn/npm)
    npm install
    # OR if using yarn/pnpm
    yarn install
    ```

4.  **Verify Setup**:
    *   Check if `apps/web/.env.local` exists.
    *   Run `npm run dev` in `apps/web` to test.

---

## 4. Immediate Next Steps (RunPod Context)
Once you are set up, refer to `docs/runpod_integration.md` to resume the RunPod integration work.
