# RunPod Integration Status (Feb 20, 2026)

> **Context**: This document summarizes the state of offloading Math/Physics question generation to a RunPod instance hosting the `PhysicsWallahAI/Aryabhata-1.0` model.

## 1. Architecture Overview (The "Rogue Routing" Logic)

We have implemented a dual-client system within `vertex-client.ts` to optimize cost and performance for specialized subjects.

### How It Works
*   **Primary Client**: Google Gemini 1.5 Flash (via Vertex AI).
*   **Specialized Client**: RunPod (vLLM hosting `Aryabhata-1.0`).
*   **Routing Logic**:
    *   The `generateContent` function inspects the prompt and system instructions.
    *   If keywords `Math` or `Physics` are detected, the request is **routed to RunPod**.
    *   If RunPod fails (timeout, 500 error, or invalid JSON), the request **falls back to Gemini**.

### Key Files
*   `apps/web/supabase/functions/_shared/vertex-client.ts`: Contains the `generateContentRunPod` function and the fallback logic.
*   `apps/web/supabase/functions/debug-runpod/index.ts`: A dedicated Edge Function to test connectivity to the RunPod instance.
*   `apps/web/supabase/functions/generate-batch/index.ts`: The main consumer of this logic for generating question batches.

---

## 2. Status as of Feb 10, 2026

We left off while debugging critical integration issues.

### 🔴 Critical Issues
1.  **500 Internal Server Errors**: The RunPod instance was frequently timing out or returning 500 errors under load, especially with batch requests.
2.  **Duplicate Questions**: The `generate-batch` function was producing identical questions in a single batch, suggesting the model's temperature or entropy settings were not effectively creating diversity.
3.  **JSON Formatting**: The specialized model occasionally returned conversational text instead of strict JSON, triggering the fallback mechanism more often than desired.

### ✅ What Works
*   **Connectivity**: We can successfully ping the RunPod instance from `debug-runpod`.
*   **Fallback**: The system correctly saves the request by reverting to Gemini when RunPod fails, ensuring no user-facing downtime.

---

## 3. Next Steps (Action Plan)

To finalize this integration, we need to:

1.  **Stabilize RunPod**: Investigate the 500 errors. (Is the vLLM instance running out of memory? Is the context window too small?)
2.  **Fix Duplicates**: Modify the prompt strategy in `generate-batch` to force diversity (e.g., passing a unique seed or explicit instruction for distinct concepts).
3.  **Strict JSON Mode**: Refine the system prompt on the RunPod side to strictly enforce JSON output, potentially using a grammar constraint if vLLM supports it.
