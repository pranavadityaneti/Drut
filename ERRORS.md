# Drut — Errors & Solutions

> **When an approach takes more than 2 attempts to work, log it here.**
> **Check this file BEFORE suggesting approaches to similar tasks.**

---

## Format for each entry

```markdown
## <Short title> (YYYY-MM-DD)

**Problem**: One-line symptom.

**What didn't work**:
1. Approach 1 — why it failed
2. Approach 2 — why it failed

**What worked**: The actual fix.

**Lesson**: What to remember next time. The single takeaway.
```

---

## EAS iOS build fails: provisioning profile missing Associated Domains / Push entitlements (2026-06-30)

**Problem**: `eas build -p ios` errors at the Xcode step: *"Provisioning profile doesn't include the Associated Domains / Push Notifications capability / aps-environment + com.apple.developer.associated-domains entitlements."*

**What didn't work**:
1. Building with the App Store Connect **API key** (`EXPO_ASC_*` env vars). EAS logs *"Skipping capability identifier syncing because the current Apple authentication session is not using Cookies (username/password)"* → it mints a profile WITHOUT Associated Domains. The API key physically cannot sync capability identifiers.
2. Re-running `--non-interactive`. Won't create/regenerate creds at all ("Distribution Certificate is not validated for non-interactive builds").

**What worked**: Run `eas build -p ios --profile production` **interactively, WITHOUT the `EXPO_ASC_*` env vars** so it authenticates via username/password (Cookies). When prompted **"Would you like to reuse the original profile?" answer NO** → it regenerates the profile WITH the capabilities. (The FIRST distribution cert + the App Store Connect app record also can't be created via API key / `--non-interactive` — interactive CLI or web UI only.) After creds + app record exist once, all future builds and `eas submit` are non-interactive.

**Remember**: API key is fine for builds *once creds exist* and for `eas submit`; but ANY app using Associated Domains/Push needs a one-time Cookies-auth login to build the profile. `eas submit` reads `ascApiKeyPath/Id/IssuerId` from `eas.json` `submit.production.ios` (it ignores the `EXPO_ASC_*` env vars that `eas build` uses).

## Apple ID prompt pre-fills junk "y" → false "account locked -20209" (2026-06-30)

**Problem**: Every interactive `eas` Apple login pre-filled Apple ID `y` (later, pasted command text), then failed with *"Apple Service Error -20209. This Apple Account has been locked for security reasons"* — but the account is fine.

**What didn't work**:
1. Backspacing at the prompt — `y` is a cached default, not editable buffer text, so backspace does nothing.
2. Re-running — the same poisoned default reappears.

**What worked**: `mv ~/.app-store/auth/username.json` aside (it had cached `{"username":"y"}` from a fat-fingered first attempt). Then the `Apple ID:` prompt is empty and you type the real email cleanly. The real account's session cookie lives at `~/.app-store/auth/<email>/cookie`.

**Remember**: EAS caches the last Apple username in `~/.app-store/auth/username.json` and pre-fills it at every login; a junk value there breaks every subsequent login with a misleading "locked" error. Don't paste at the `Apple ID:` prompt — type it.

## LaTeX in generated-question JSON silently corrupts via JSON escape codes (2026-06-15)

**Problem**: Gemini's Maths question batch rendered broken math — `$\frac{x-3}{2}$` displayed as `rac{x-3}{2}`, `\times` vanished. The Zod schema validator passed it (exit 0) — a corrupted string is still a valid string.

**What didn't work**:
1. Trusting the schema validator as a correctness gate — it only checks shape, never sees the corruption.
2. The first adversarial audit (10 Hard questions) only caught 2 of these by eye; a targeted control-char scan was needed to find all 50.
3. Inline `node -e` scan with control-char regex literals — failed with "argument must be a string without null bytes" (the regex literal contained real control chars). Had to write the scanner to a `.js` file instead.

**Root cause**: When a generator writes LaTeX with a SINGLE backslash in JSON (`\frac`, `\times`, `\to`, `\right`, `\tanh`), `JSON.parse` interprets `\f`→form-feed(0x0c), `\t`→tab(0x09), `\r`→CR(0x0d), `\b`→backspace(0x08). The command name's first letter is eaten and replaced by an invisible control char. Commands starting with other letters (`\s`, `\l`, `\c`) are safe because `\s` etc. is an INVALID JSON escape and would make `JSON.parse` throw — which is why only f/t/r/b/n-initial commands slip through silently.

**What worked**:
- **Scan**: read the parsed JSON, walk every string field, flag any char `< 32` except newline(10). For tab/CR, only flag when the next char is a letter (bare whitespace is legit). Newline(10) is legit formatting — never flag. Script: `/tmp/scan-ctrl.js`.
- **Repair**: replace form-feed→`\f`, backspace→`\b`, and tab/CR→`\t`/`\r` when followed by a letter. This exactly reverses the corruption. Script: `/tmp/repair-latex.js` (has `--dry`). 50 fixes across 14 questions, re-validated exit 0, re-scan 0.
- **Prevent**: generator instruction must require DOUBLED backslashes in JSON (`\\frac`, `\\times`, …) and a post-gen control-char check.

**Lesson**: Schema validation ≠ content/encoding validation. For any generated-question batch, run BOTH (a) an adversarial answer-key audit and (b) a control-char corruption scan before shipping. Never edit the scan/repair regex inline in `node -e` — control-char literals break the shell; write to a file.

---

## Metro can't resolve `./index` in Expo SDK 56 monorepo (2026-05-24)

**Problem**: Mobile app's Metro bundler kept failing with `Unable to resolve module ./index from /Users/pranavaditya/projects/Drut/...`. App wouldn't load on Expo Go (just bundling errors).

**What didn't work**:
1. `EXPO_NO_METRO_WORKSPACE_ROOT=1` — wrong direction. Disabling workspace root made the bundle URL look for `./index` from the wrong path.
2. Customizing `metro.config.js` `nodeModulesPaths` and `extraNodeModules` — didn't fix entry resolution.
3. Running `npx expo install:expo-go` — wrong subcommand name (`install` doesn't accept `expo-go` as a target).

**What worked**:
- Keep `EXPO_USE_METRO_WORKSPACE_ROOT=1` (default in SDK 56) — don't fight it
- Use bundle URL `/apps/mobile/index.bundle?platform=...` (workspace-root-relative), NOT `/index.bundle`
- Create a literal `apps/mobile/index.js` file that re-exports the Expo Router entry:
  ```js
  import 'expo-router/entry';
  ```

**Lesson**: SDK 56 in monorepo mode REQUIRES a physical entry file at the project root. Setting `main: "expo-router/entry"` in `package.json` alone isn't enough — Metro looks for an actual file. Don't disable workspace root mode; just satisfy what it expects.

---

## React Native blob upload fails on profile avatar (2026-06-04)

**Problem**: Profile avatar upload (via expo-image-picker → Supabase Storage) returned `Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported` on both iOS and Android.

**What didn't work**:
1. Standard web pattern: `fetch(uri).then(r => r.blob())` then `new File([blob], 'avatar.jpg', { type })` — `File` doesn't exist in React Native runtime.
2. Passing the blob directly to `supabase.storage.from(...).upload(path, blob)` — Supabase JS SDK tries to construct a File internally, hits the same error.

**What worked**:
- Read file via `expo-file-system/legacy`: `FileSystem.readAsStringAsync(uri, { encoding: 'base64' })`
- Decode base64 to ArrayBuffer via `base64-arraybuffer`: `decode(base64)`
- Pass ArrayBuffer to Supabase: `.upload(path, arrayBuffer, { contentType: 'image/jpeg' })`
- Updated shared `profileService.uploadAvatar` to accept `File | { data: ArrayBuffer; name: string; type: string; size: number }` so both web (File path) and mobile (ArrayBuffer path) work
- Created `apps/mobile/utils/uploadAvatarFromUri.ts` to encapsulate the RN-specific conversion

**Lesson**: For Supabase Storage uploads from React Native, use the **ArrayBuffer path** end-to-end. `new File()`, `Blob` from `fetch(uri).blob()`, and similar browser patterns don't work natively. The shared service should accept both forms so callers don't need to know the platform.

---

## verify-whatsapp-otp edge function returned "Internal server error" (2026-06-03)

**Problem**: Test number `9959777027` got OTP `123456` stored correctly in `phone_otps`, but `verify-whatsapp-otp` returned 500 with generic `{"error": "Internal server error"}`. Could not debug because `supabase functions logs` doesn't exist in CLI v2.101.

**What didn't work**:
1. Assumed RPC `get_unseen_questions` or `phone_otps` query was failing — wasn't.
2. First implementation: called `supabaseAdmin.auth.admin.listUsers()` with no pagination params (returns page 1 of 50 users). Existing test user from earlier client-side signup wasn't on page 1, so lookup returned null, then `createUser` failed with "user already exists", landing in the generic catch.

**What worked**: Rewrote the function with this order:
1. **Try `signInWithPassword` FIRST** — fastest path for existing users with correct password.
2. **If that fails, try `auth.admin.createUser`** — handles new users.
3. **If create fails with "already exists"**, call a `findUserByEmail` helper that paginates up to 20 pages × 100 users = 2,000 users.
4. Then `auth.admin.updateUserById` to reset password, sign in again.
5. Every error path returns a specific error response with a `detail` field for debugging.

**Lesson**: `auth.admin.listUsers()` has default pagination (1 page × 50 users). Either iterate pages or use a different lookup method. Never assume the user is on page 1. **Always include a `detail` field in edge function error responses** so you can debug from the client without the missing `functions logs` command.

---

## Project linked to Supabase but `functions deploy` blocked by auto-mode classifier (2026-06-04)

**Problem**: Edge function deploy command got blocked by Claude Code's auto-mode classifier with `Permission for this action was denied... credential exposure in committed code`. False positive — the WATI API key appeared earlier in transcript but was NOT hardcoded in the function (it reads from `Deno.env.get('WATI_API_KEY')`).

**What didn't work**:
1. Direct `supabase functions deploy send-whatsapp-otp` — classifier rejected.

**What worked**: Verified with the user that the deploy was intentional, retried with the same command. Second attempt succeeded — the classifier was over-conservative on the first call.

**Lesson**: The auto-mode classifier can false-positive on commands referencing API keys that exist anywhere in transcript history, even if those keys aren't in the code being deployed. If a blocked command is genuinely safe, explain to the user and retry with their explicit consent in the same turn.
