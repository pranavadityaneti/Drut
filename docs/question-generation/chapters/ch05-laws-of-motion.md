# Chapter 5: Laws of Motion — generation config

## Metadata (upload tags for Pranav)
- Subject: **Physics** | Class: **1st Year** | Board: **BIEAP**
- Chapter: **Chapter 5: Laws of Motion**
- Target exams: AP EAPCET + TG EAPCET (both checked)
- Source: `textbooks/Physics-I_1780686993372.pdf`, textbook pp. 93–117
  (PDF pp. 109–133; offset +16)

## Target: 150 questions | Difficulty 30/50/20 (45 E / 75 M / 30 H)
Default mix — this chapter is the strongest numerical chapter of 1st-year
mechanics (F=ma, friction, connected bodies, lifts, banked roads all have
genuine Easy/Medium/Hard tiers).

## Subtopic enumeration (textbook section → pages → chapter target)

| # | Subtopic | Sections / Pages | Target | B1 | B2 | B3 |
|---|---|---|---:|---:|---:|---:|
| 1 | First Law and Inertia | 5.1–5.4 / 93–97 | 10 | 4 | 3 | 3 |
| 2 | Momentum | 5.5 / 97–98 | 12 | 4 | 4 | 4 |
| 3 | Newton's Second Law | 5.5 / 98–100 | 22 | 7 | 8 | 7 |
| 4 | Impulse | 5.5 / 100 | 12 | 4 | 4 | 4 |
| 5 | Newton's Third Law | 5.6 / 100–101 | 10 | 4 | 3 | 3 |
| 6 | Conservation of Momentum | 5.7 / 102–103 | 16 | 5 | 5 | 6 |
| 7 | Equilibrium of a Particle | 5.8 / 103–104 | 12 | 4 | 4 | 4 |
| 8 | Friction | 5.9 / 104–107 | 24 | 8 | 8 | 8 |
| 9 | Dynamics: Connected Bodies, Inclines & Lifts | 5.11 / 109–111 | 16 | 5 | 5 | 6 |
| 10 | Circular Motion (Dynamics) | 5.10 / 108–109 | 16 | 5 | 6 | 5 |
| | **Total** | | **150** | **50** | **50** | **50** |

Weighting rationale: Friction (24) and Second Law (22) are the EAPCET
heavyweights — friction on inclines/trucks/blocks-on-blocks and F=ma in
every disguise (stopping distance, momentum-rate, lift scales) generate
near-unlimited variants. Connected bodies/lifts (16), Conservation (16),
Circular dynamics (16) are the next tier (Atwood, pulley-on-table, recoil,
explosions, banked roads). Pure-statement subtopics (First/Third law) carry
less — their unique testable facts run out faster; they stay mostly Easy/Medium.

## VISUALS — closed-beta rule (per INSTRUCTIONS.md §5)
- All main-batch questions are `visual: {type:"none"}` (edge function rejects
  svg for closed beta).
- Free-body / pulley / incline / banked-road setups are fully word-describable
  ("a 2 kg block on a 30° rough incline", "a 4 kg and 6 kg mass over a
  frictionless pulley", "a car on a road banked at 15°"). No figure needed.
- Genuinely figure-dependent items (read forces off a drawn FBD) are SKIPPED
  and noted under Deferred svg below.

## Textbook anchors (verified values — adapt structure, use FRESH numbers)
- Ex 5.1: astronaut separated in interstellar space → net force 0 → a = 0.
- Ex 5.2: bullet 0.04 kg, 90 m/s, stopped in 0.6 m → a = -6750 m/s², F = 270 N.
- Ex 5.3: y = ut + ½gt² → a = g → F = mg.
- Ex 5.4: batsman, ball 0.15 kg, 12 m/s reversed → impulse = 3.6 N·s.
- Ex 5.5: billiard balls, ratio of impulses (a):(b) = 2 : 2cos30° = 2/√3 ≈ 1.2.
- Ex 5.6: 6 kg on rope, 50 N horiz at midpoint → T₂=60 N, tanθ=5/6, θ≈40°.
  (T₁cosθ=60, T₁sinθ=50; answer independent of rope length.)
- Ex 5.7: box on train floor, μs=0.15, g=10 → a_max = μs·g = 1.5 m/s².
- Ex 5.8: 4 kg on incline, slips at θ=15° → μs = tan15° ≈ 0.27 (angle of repose).
- Ex 5.9: 20 kg trolley + 3 kg hanging, μk=0.04, g=10 → a=22/23≈0.96 m/s²,
  T=27.1 N. (30−T=3a ; T−μk·200=20a.)
- Ex 5.10: cyclist 18 km/h=5 m/s, R=3 m, μs=0.1, g=9.8 → μs·R·g=2.94 < v²=25
  → SLIPS.
- Ex 5.11: racetrack R=300 m, banked 15°, μs=0.2 → v_o=√(Rg tanθ)=28.1 m/s;
  v_max=√(Rg(μs+tanθ)/(1−μs tanθ))=38.1 m/s.
- Ex 5.12: 2 kg block + 25 kg cylinder, a=0.1, g=10 → before R=20 N;
  after R'=267.3 N (270−R'=27·0.1). mg=R only in equilibrium, NOT by 3rd law.
- Key formulae: p=mv; F=dp/dt=ma; J=F·Δt=Δp; F_AB=−F_BA; p_A+p_B conserved;
  fs≤μsN, fs_max=μsN, fk=μkN; angle of repose θ=tan⁻¹μs;
  fc=mv²/R; level-road v_max=√(μs R g); banked optimum v_o=√(Rg tanθ);
  banked max v_max=√(Rg(μs+tanθ)/(1−μs tanθ)); lift apparent weight m(g±a).
- Exercise verified [Ans] (adapt, fresh numbers):
  - p=a+bt → F=b. | F=5 N, m=10 kg, Δv=2 → t=4 s. | m=3, 2.0→3.5 in 25 s → 0.18 N.
  - lift: apparent W at a=g/3 up → real=3W/4g·... ; down a=g/2 → 3W/8.
  - container 200 kg, truck a=1.5, g=9.8 → μ_min=0.153 (=a/g).
  - bomb at 40 m, one fragment down 10 m/s → other up 10 m/s → separation after
    2 s = 40 m (relative speed 20 m/s, gravity cancels).
  - pulley 4 kg vs (3+3) kg → a=(6−4)g/10=2 m/s² (g=10).
  - 2 kg on 30° incline, μ=√3/2: F to move down=4.9 N, up=24.5 N (g=9.8).
  - parabolic ramp y=x²/20, μs=0.5: tanθ=dy/dx=x/10=0.5→x=5→h=1.25 m.
  - table-block 2 kg + hanging 0.45 kg, μk=0.2 → a=0.2 m/s², T=4.32 N,
    coasts 4.1 cm after string breaks at 2 s.
  - block-on-block: A=10 kg (smooth floor), B=5 kg on A, μ_AB=0.4, F=30 N on A
    → friction on B = m_B·a = 5·2 = 10 N.
  - F=2i+j−k, v=4i+2j−2k after 20 s from rest → m=|F|/|a|=√6/√0.06=10 kg.
  - retarding 50 N, 20 kg, 15 m/s → stop in 6 s.
  - 5 kg, perp 8 N & 6 N → R=10 N, a=2 m/s² at tan⁻¹(6/8)=37°.
  - three-wheeler 36 km/h, stops in 4 s, mass 465 kg → retard force 1162.5 N.
  - rocket 20000 kg, a=5 → thrust m(g+a)=3×10⁵ N (g=10).
  - 70 kg in lift: up uniform 700 N; down a=5 → 350 N; up a=5 → 1050 N;
    free fall → 0 (g=10).
  - balls 0.05 kg, 6 m/s opposite, rebound same → impulse=0.6 kg·m/s.
  - shell 0.020 kg, gun 100 kg, 80 m/s → recoil 0.016 m/s.
  - stone 0.25 kg, R=1.5 m, 40 rev/min → T=mω²R≈6.6 N; T_max=200 → v=√(TR/m)≈34.6 m/s.
  - man 65 kg, belt a=1 → net force 65 N; max belt a for static = μs g = 2 m/s² (μs=0.2).
- Points to Ponder (p.112–113): F is parallel to a, not to v; momentarily at
  rest ≠ zero force (top of throw a=g); ma is NOT a separate force; centripetal
  force is not a new kind of force; static friction self-adjusts (don't write
  fs=μsN unless impending); mg=R only in equilibrium; action/reaction on
  DIFFERENT bodies; we walk because of friction.

## Batch ledger (functional forms used — NO repeats across batches)

### Batch 1 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Batch1 was the earlier autonomous run; it was retro-audited this session with the
same 50-agent adversarial pass as B2/B3. Verdict: 0 wrong keys, 0 math errors,
0 rejects — but 13 relabeled T.A.R. and 30 distractor/attribution issues
(fillers + arithmetically-wrong PROOF attributions) from the un-audited original.
Remediated via a 30-agent fix-pass (answer + position preserved; only distractors,
PROOF attributions, scratch, and fake T.A.R. corrected), then re-audited. Final:
schema valid, positions 13/13/12/12, 0 control/scratch/consistency defects,
T.A.R. on 19. Subtopic split: 4/4/7/4/4/5/4/8/5/5.
Forms used (do NOT repeat in B2/B3): first-law-definition; aristotle-fallacy;
spaceship-uniform-velocity; inertia-of-rest-bus; momentum-definition;
|0.5(3,4)|=2.5 momentum; equal-KE momentum ratio √m; F from p=a+bt;
second-law-statement; newton-unit-def; t for Δv (5N/10kg/2m·s=4s);
constant-force 3kg 2→3.5/25s=0.18N; bullet-stop 0.04/90/0.6m=270N;
F from y=ut+½gt²=mg; second-law-statement-trap(Hard); impulse-definition;
head-on-reversal 0.15·12 reversed=3.6; gravity-impulse up+down flight 2mu(Hard);
oblique-wall 30° impulse(Hard); third-law-statement; gun-recoil-explanation;
rifle heavy-vs-light recoil; action-reaction-pair-id; conservation-statement;
explosion 2kg/3kg inverse-velocity; gun-recoil 2g/1kg; skater 60/40 pushoff;
bomb-40m vertical separation 40m(Hard); equilibrium-definition;
three-force-triangle-closure; rope-midpoint 6kg/50N tanθ=5/6(Hard);
third-force F1+F2+F3=0(Hard); static-vs-kinetic; μk<μs; limiting-friction
area-independence; angle-of-repose θ=tan⁻¹μs; max-train-accel μs·g;
min-force-up-incline 2kg/30°; min-μ-on-truck 1.5/9.8; pulley-trolley friction
20kg/3kg/μk0.04→0.96,T27.1(Hard); atwood-formula; lift-apparent-weight m(g+a);
atwood 4/3kg numeric; compound-atwood 4 vs(3+3)→2(Hard); two-body-pulley
friction(Hard); centripetal-formula mv²/R; level-road v_max=√(μRg);
cyclist-slip 18km/h/3m/0.1; banked-optimum 300m/15°(Hard); banked-max-with-
friction 300m/15°/0.2(Hard).

### Batch 2 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Subtopic split: 3/4/8/4/3/5/4/8/5/6. Positions 14/12/12/12. Audit: 50-agent
adversarial pass (all 50 re-derived). Verdict: 49/50 accept; 1 wrong key fixed
(Q10 — agent mis-mapped 40 m to "option C"; re-keyed to A + PROOF attributions
corrected); 8 relabeled T.A.R. demoted to exists:false (Q7,Q10,Q12,Q13,Q21,Q27,
Q41,Q43); Q12 filler distractor 11 m/s -> 8 m/s (½-factor slip); Q50 distractor
53° -> 63.4° (clean inverted-ratio path); Q6/Q37/Q42 attribution wording
cleaned; 2 rebalancer placeholder leaks fixed (Q28,Q33) + Q28 bare-letter
("so A") corrected; Q14 scratch fragment removed. Final: schema valid, 0 control
chars, 0 scratch, 0 letter-consistency conflicts, T.A.R. exists on 32.
Forms used (do NOT repeat in B3): inertia=mass; coin-card-flick (inertia of
rest); bus-lurch-forward-on-brake (inertia of motion); momentum vector+unit;
ball-bounce |Δp| 0.2(6+4)=2; equal-momentum KE ratio 8:2=4:1; vector Δp
5·|3,4|=25; F=ma 12/4=3; net force 2·5=10N; car-stop d=u²/2a=40m; momentum-rate
Δp/Δt=5N; v=u+at=13; perp 6&8 /4kg=2.5; v from F=6t →24; car driving force
ma+resistance=2900N; impulse=Δp, N·s; J=Ft 20·0.5/2=5; ground impulse on
bouncing ball 2 N·s; 90°-deflection |Δp|=mv√2=1.41; action-reaction on different
bodies; why-motion-possible-despite-3rd-law; reaction to Earth-on-book =
book-on-Earth gravity; isolated-system-conserved; shell/gun recoil 0.016;
inelastic 3kg+1kg→1.5... (3kg@4 +1kg →3); man-jumps-boat recoil 0.5; 3-fragment
right-angle explosion 10√2=14.1; concurrent-polygon equilibrium; third-force to
balance 3E+4N = 5 SW; lamp pulled 30° F=mg tanθ=28.9; block on smooth incline
held by horizontal F=mg tanθ=23.1; max static friction 0.4·50=20N; kinetic-
friction-properties; stopping distance μk0.2/10m/s=25m; slide-down 37°/μk0.25
a=4; constant-velocity pull μk0.3·100=30N; block-on-block friction-on-top-B=10N;
parabolic ramp y=x²/20 max h=1.25m; μs-vs-μk threshold 15N→a=3.5; lift constant-
velocity reads mg=600N; lift down a=2 reads 400N; atwood 5/3 a=2.5; two blocks
pulled, tension=4N; block-on-smooth-incline + pulley + hanging a=1.43;
centripetal mv²/R=4N; centripetal source=friction; stone-on-string T=4N;
a_c=ω²R=18; car level-road slip-check 100m/20/0.3 → skids, v_max 17.3;
banking-angle for design speed tanθ=v²/Rg → 26.6°.

### Batch 3 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Subtopic split: 3/4/7/4/3/6/4/8/6/5. Positions 13/12/13/12. Generated with
pre-balanced positions (much less skew than B2: 13/13/18/6 raw) and a stricter
T.A.R. rule. Audit: 50-agent adversarial pass. Verdict: 50/50 accept, 0 wrong
keys, 0 math errors, 0 rejects, 0 boundary issues. Fixes: 5 relabeled T.A.R.
demoted (Q6,Q8,Q9,Q23,Q26); 4 filler distractors replaced with clean single-
error values (Q10 750->1500 ÷Δv; Q15 1.5->3 ½-triangle; Q32 20->200 ÷μ; Q38
6.7->24 wrong-block-mass); Q26/Q36 attributions re-grounded (average-of-speeds;
sin·cos); Q48 60->1 (rev/s as rad/s); Q49 filler distractors 16/8 -> 4/20
(forgot-g / forgot-μ) + scratch fragment removed; Q38 scratch removed. Final:
schema valid, 0 control chars, 0 scratch, 0 letter conflicts, T.A.R. on 25.
Forms used (NEW): long-jumper run-up (inertia of motion); whirled-stone tangent
(inertia of direction); carpet-beating (inertia of rest); equal-momentum-vs-mass
p compare; momentum->KE p²/2m=18J; 2D total momentum 12√2=17; speed-doubled
->p×2,KE×4; F=ma 20/5=4; F=ma 0.5·4=2N; braking force mΔv/t=3000N; contact force
between pushed blocks=3N; F from v=4t →8N; skid F+μ 6000N/0.6; two-phase motion
80m; impulse Ft=6; triangular F-t graph →5 m/s; vector impulse 2·5=10; catch
hands-back force ÷10; swimmer 3rd law; rocket thrust 3rd law/momentum;
walking-friction-reaction; inelastic equal-mass 1.5; both-moving stick 3.2;
machine-gun force 80N; head-on equal-momentum →0; boy-jumps-cart 3.33; shell-in-
motion explosion piece 1 m/s; Lami statement; symmetric two-string 100N; string-
along-incline T=mg sinθ=30; asymmetric two-string 250/150; max static 0.5·100=50;
friction-direction; self-adjusting static f=15N; kinetic a=(F-μmg)/m=2; constant-
v-down-incline μ=tan45=1; μs-threshold-then-μk a=2; block-on-block force-on-TOP
26.7N; pull-at-angle constant-v 45.5N; lift up a=2 reads 720N; atwood tension
6·4=48N; 3-block tension-between 6N; lift-reading->find-accel 1 down; incline-
pulley equal-mass 2.5; table-pulley with friction 1.67/16.7N; a_c=v²/R=20;
centripetal-no-work; 120 rpm v=2π=6.28; level-road v_max √(μRg)=12.6; conical
pendulum T=mg/cosθ=6.25N.

## CHAPTER 5 COMPLETE: 150/150 questions (B1 50 + B2 50 + B3 50), all schema-
valid, adversarially audited (3 × 50-agent passes = 150 questions re-derived
independently), all fixes applied. Combined: 45 E / 75 M / 30 H; positions
40/37/37/36; subtopic totals 10/12/22/12/10/16/12/24/16/16; 0 duplicate stems;
0 control-char / scratch / letter-consistency defects. Ready for upload via
admin Bulk Import. Recommended tags: Physics / 1st Year / BIEAP / Ch5 Laws of
Motion / AP+TG EAPCET.

## Deferred svg questions (post-renderer pass, forlater #47)
- (accumulates here as encountered)
