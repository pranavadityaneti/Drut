# Drut — Project Rules

## Drut is three clients: web + Android + iOS
Drut ships as a **web dashboard** (`apps/web`) and **Android + iOS apps** (`apps/mobile`, shared React Native / Expo). Every fix, feature, or edit is in-scope for all three by default:

- A change is not "done" until it is correct on **web, Android, AND iOS** — or you have explicitly confirmed a client is exempt and said why.
- Put shared logic in `packages/shared` so the clients can't drift. The same logic duplicated per-client is a smell — centralize it.
- Android + iOS share one codebase (`apps/mobile`), but still verify platform-specific surfaces (WebView, fonts, native modules, permissions, safe-area) on both.
- When presenting a task or a diff, state explicitly what changes on **web**, on **mobile (Android + iOS)**, and in **shared** — and call out anything intentionally left to one client.
