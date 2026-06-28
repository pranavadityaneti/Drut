# Chapter 5: Laws of Motion — generation config

## Metadata (upload tags for Pranav)
- Subject: **Physics** | Class: **1st Year** | Board: **BIEAP**
- Chapter: **Chapter 5: Laws of Motion**
- Target exams: AP EAPCET + TG EAPCET (both checked)
- Source: `textbooks/Physics-I_1780686993372.pdf`, textbook pp. 93–115
  (PDF pp. 109–131; offset +16)

## Target: 150 questions | Difficulty 30/50/20 (45 E / 75 M / 30 H)
Strong numerical gradient (F=ma, friction, inclines, banking).

## Subtopic enumeration (textbook section → pages)

| # | Subtopic | Pages | Target |
|---|---|---|---:|
| 1 | First Law and Inertia | 94–97 | 12 |
| 2 | Momentum | 97–98 | 12 |
| 3 | Newton's Second Law | 98–100 | 22 |
| 4 | Impulse | 100 | 12 |
| 5 | Newton's Third Law | 100–102 | 12 |
| 6 | Conservation of Momentum | 102–103 | 14 |
| 7 | Equilibrium of a Particle | 103–104 | 13 |
| 8 | Friction | 104–107 | 24 |
| 9 | Dynamics: Connected Bodies, Inclines & Lifts | 108–110 | 16 |
| 10 | Circular Motion (Dynamics) | 108–109 | 13 |
| | **Total** | | **150** |

Weighting: Second Law (22), Friction (24), connected-body/incline/lift
Dynamics (16), and Circular-motion banking (13) are the EAPCET heavyweights.

## Chapter-specific notes — VISUALS
- Per INSTRUCTIONS.md §5: all `visual:{type:"none"}`. Free-body-diagram,
  pulley, incline, and banking setups are described in WORDS ("a 2 kg block
  on a 30° incline", "masses 4 kg and 3 kg over a frictionless pulley",
  "a 50 N horizontal force at the midpoint of a rope"). No figure needed.

## Textbook anchors (verified — adapt with fresh numbers)
- 1 N = 1 kg·m/s². p = mv [MLT⁻¹]. F = dp/dt = ma. J = FΔt = Δp [MLT⁻¹].
- Ex 5.2: bullet 0.04 kg @ 90 m/s stopped in 0.6 m → a = -6750 m/s², F = 270 N.
- Ex 5.4: ball 0.15 kg hit back at 12 m/s → impulse = 3.6 N·s.
- Ex 5.5: ball reflects off wall head-on impulse 2mu; at 30° to normal 2mu cos30°; ratio 2/√3≈1.2.
- Ex 5.6: 6 kg on rope, 50 N horiz at midpoint → T₂=mg=60 N, tanθ=50/60, θ≈40°.
- Friction: f_s ≤ μ_s N, f_s,max = μ_s N; f_k = μ_k N; μ_k < μ_s. Angle of repose tanθ_max = μ_s.
- Ex 5.7: box on train, μ_s=0.15 → a_max = μ_s g = 1.5 m/s².
- Ex 5.8: block slides at θ=15° → μ_s = tan15° = 0.27.
- Ex 5.9: 20 kg trolley + 3 kg hang, μ_k=0.04 → a=22/23=0.96 m/s², T=27.1 N.
- Ex 5.10: cyclist 5 m/s, R=3, μ_s=0.1 → μ_sRg=2.94 < 25 → SLIPS.
- Ex 5.11: racetrack R=300, banked 15°, μ=0.2 → v_o=28.1 m/s, v_max=38.1 m/s.
- Circular: f_c = mv²/R. Level road v_max = √(μ_s Rg). Banking optimum v_o = √(Rg tanθ).
  v_max(banked) = [Rg(μ_s+tanθ)/(1-μ_s tanθ)]^(1/2).
- Exercise answers: p=a+bt → F=b; 5N/10kg/Δv=2 → t=4s; F=ma 0.18 N; lift apparent
  W↑(g/3)=(4/3)mg, ↓(g/2)=mg/2=3W/8; container truck a=1.5 → μ=0.153; bomb 40m
  splits, sep after 2s = 40m; pulley 4 vs 3+3 → a=2 m/s²; incline 30° μ=√3/2 forces
  4.9N/24.5N; parabola y=x²/20 μ=0.5 → max h=1.25m; 2kg+0.45kg μ=0.2 → a=0.2,T=4.32N;
  blocks A10/B5 μ=0.4, 30N → friction 10N; force 2î+ĵ-k̂, v 4î+2ĵ-2k̂ @20s → m=10kg.
- Points to Ponder: force ∥ acceleration (not velocity); v=0 ≠ a=0 (ball at top a=g);
  F=ma F is NET external, ma not a separate force; centripetal not a new force; static
  friction self-adjusting (don't use μ_sN unless at limit); mg=R only in equilibrium
  (lift differs); action-reaction on DIFFERENT bodies; μ can exceed 1.

## Batch ledger (functional forms used — no repeats across batches)

### Batch 1 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Subtopic split: 4/4/7/4/4/5/4/8/5/5. Positions 13/13/12/12, TAR
exists=32. Audit verdict: 10/10 math correct, ZERO structural defects
(no option-equivalence, no wrong-method coincidences), zero scratch
text. Best Hard-round of the session. Self-caught pre-validation: Q6
scratch-leak cleaned; Q19 had B=√3 mu and D=2mu cos30° (mathematically
equal — same defect class as Ch3-B2-Q44) — replaced B with mu/2;
Q44 scratch ("... no — it actually gives") rewritten. Audit fixes:
Q40 distractor C (2.40 had no derivable path) → 1.65 m/s² with
sign-error-on-friction path; Q45 PROOF re-attributed for D
(reports total-mass-as-acceleration) and A (net force in newtons,
units slip). File: `physics-i-ch05-laws-of-motion-batch1.json` in
the worktree, NOT yet committed (per chapter-completion policy).
Forms used in Batch 1: spaceship in deep space; momentum from
components 3î+4ĵ; equal-KE √(m₁/m₂) ratio; p = a + bt → F = b;
bullet 0.04 kg @ 90 m/s / 0.6 m → 270 N; F:2→3.5 m/s in 25 s on
3 kg → 0.18 N; y = ut + ½gt² → F = mg; second-law statement trap
(ma-as-force fallacy); cricket-ball reversal 0.15 kg @ 12 m/s →
3.6 N·s; vertical-throw impulse 2mu down; oblique elastic 30°
reflection → 2mu cos 30°; bomb 2 kg / 3 kg pieces → 12 m/s
opposite; 2 g bullet from 1 kg gun → 0.8 m/s recoil; 60-40 kg
skater push-off → 3 m/s opp; 40 m bomb split → 40 m separation
in 2 s; rope-midpoint 6 kg + 50 N horizontal → θ ≈ 40°;
three-force equilibrium (4,3) + (-2,-5) → (-2,2); angle of repose
30° → μ = 1/√3; box on train μ = 0.2 → a_max = 2 m/s²;
30° incline μ = √3/2 push up no-accel → 25 N; container truck
a = 1.5 m/s² → μ = 0.153; trolley 20 kg + 3 kg hang μ = 0.04 →
0.96 m/s² (Ex 5.9); Atwood 4 vs 3 kg → 10/7 m/s²; compound
Atwood 4 vs 3+3 → 2 m/s²; 2 kg + 0.45 kg with μ = 0.2 → 0.2 m/s²;
lift a = g/3 up → W' = 4W/3; level-road v_max = √(μRg);
cyclist 5 m/s, R = 3, μ = 0.1 → slips (Ex 5.10); banked 300 m
@ 15° optimum 28.1 m/s (Ex 5.11a); banked + μ = 0.2 max
38.1 m/s (Ex 5.11b).

### Batch 2 (50) — status: pending. Avoid all 30+ forms listed above.
### Batch 3 (50) — status: pending.

## Deferred svg questions (post-renderer pass, forlater #47)
- (none expected; all describable in words)
