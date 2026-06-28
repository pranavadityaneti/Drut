# Drut — Project Rules

## Drut is three clients: web + Android + iOS
Drut ships as a **web dashboard** (`apps/web`) and **Android + iOS apps** (`apps/mobile`, shared React Native / Expo). Every fix, feature, or edit is in-scope for all three by default:

- A change is not "done" until it is correct on **web, Android, AND iOS** — or you have explicitly confirmed a client is exempt and said why.
- Put shared logic in `packages/shared` so the clients can't drift. The same logic duplicated per-client is a smell — centralize it.
- Android + iOS share one codebase (`apps/mobile`), but still verify platform-specific surfaces (WebView, fonts, native modules, permissions, safe-area) on both.
- When presenting a task or a diff, state explicitly what changes on **web**, on **mobile (Android + iOS)**, and in **shared** — and call out anything intentionally left to one client.

## Fixes harden — never patch
Every fix for a bug, error, or issue must be a **concrete, solid hardening** that closes the whole class of failure — never a narrow band-aid that leaves other leaks. Find the root cause, trace every place it can manifest (all call sites, web + Android + iOS), and close them all. If only a partial fix is possible, say so explicitly — never present a patch as a complete fix.

## Audit after every implementation
After finishing any fix or feature, run a thorough self-audit before calling it done: re-examine the work adversarially for unknown bugs, edge cases, regressions, and points where it could fail — including latent issues in the *previous* implementation and any the new change might introduce. The goal is to surface hidden errors before the user does, not to confirm success. Report what the audit checked and what it found.

## Drut — Positioning & Scope (LOCKED)

1. **Multi-exam, NOT EAPCET-only.** Drut is a prep platform for ALL Indian competitive exams — all state entrance exams (AP & TG EAPCET/EAMCET and others), NEET, JEE (Main & Advanced), and other competitive exams. EAPCET is the MVP **beachhead to enter the market, NOT Drut's identity or ceiling.** Never describe or position Drut as "EAPCET-native", "an EAPCET app", or an "AP/TG app". Keep all framing, copy, and architecture exam-agnostic.

2. **Prep-tech, NOT teaching.** Drut is a prep-tech / practice platform — it does NOT teach or deliver lectures. While the user practices, Drut helps them refresh and memorize concepts. The T.A.R. and D.E.E.P. frameworks are backend pedagogy that produce the two user-facing outputs: **T.A.R. → the Quick Solution** (fast exam-time method) and **D.E.E.P. → the full step-by-step Solution**. Framework names/labels are never shown to users; the Quick + Full solutions are. Positioning vocabulary = "prep-tech / practice", never "courses / lectures / teaching".
