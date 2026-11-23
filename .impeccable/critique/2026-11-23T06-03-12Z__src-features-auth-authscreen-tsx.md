---
target: login and register pages
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/hourdavin/hackathon/src/features/auth/AuthScreen.tsx"
target_fingerprint: "sha256:0954a075402845d439c99340b3945124abd952e6e0bb3b1f602b937da023a5f9"
target_path: /Users/hourdavin/hackathon/src/features/auth/AuthScreen.tsx
timestamp: 2026-11-23T06-03-12Z
slug: src-features-auth-authscreen-tsx
---
# Critique: login & register (src/features/auth/AuthScreen.tsx)

Method: dual-agent (A: design review · B: detector + browser)

## Heuristics: 18/40 (Poor)
1 Status 2 · 2 Real world 2 · 3 Control 2 · 4 Consistency 3 · 5 Error prevention 1 · 6 Recognition 2 · 7 Efficiency 2 · 8 Minimalist 2 · 9 Error recovery 1 · 10 Help 1

## Specificity
Generic SaaS split-screen login with Khmer text. No official/trust signal, no privacy promise, Latin "CV" mark, inert benefit tiles. Detector: 0 static findings; live: placeholder contrast 3.1:1 (real), icon-tile-stack + cream-palette (false positives).

## Priority issues
- [P0] Phone: form below the fold (first input at 843px of 812; submit at ~1000-1490px). Hero + inert tiles take the first screen.
- [P1] Errors only as 3.5s toasts; fields never marked (TextField error/aria-invalid unused); duplicate toasts stack.
- [P1] Khmer digits rejected by normalizePhone (mock-db.ts:202) -> "invalid number".
- [P1] No forgot password, no password reveal (confirm field instead), no privacy note for phone/khan.
- [P2] Duplicate hint copy, "free account" SaaS wording, Latin CV mark, inert tiles look clickable.

## Minor
bg-canvas undefined token (line 112); leading-tight on Khmer h1; select placeholders repeat labels; 44px language toggle; dangling aria-describedby in Field.tsx; no SOS on auth pages.
