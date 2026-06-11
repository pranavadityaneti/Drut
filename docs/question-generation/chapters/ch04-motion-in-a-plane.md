# Chapter 4: Motion in a Plane — generation config

## Metadata (upload tags for Pranav)
- Subject: **Physics** | Class: **1st Year** | Board: **BIEAP**
- Chapter: **Chapter 4: Motion in a Plane**
- Target exams: AP EAPCET + TG EAPCET (both checked)
- Source: `textbooks/Physics-I_1780686993372.pdf`, textbook pp. 68–89
  (PDF pp. 84–105; offset +16)

## Target: 150 questions | Difficulty 30/50/20 (45 E / 75 M / 30 H)
Default mix — this chapter has a genuine numerical gradient (vectors,
projectile, circular motion all have real Easy/Medium/Hard tiers).

## Subtopic enumeration (textbook section → pages)

| # | Subtopic | Pages | Target |
|---|---|---|---:|
| 1 | Scalars and Vectors | 68–71 | 12 |
| 2 | Multiplication of Vectors by Real Numbers | 70 | 8 |
| 3 | Vector Addition and Subtraction | 70–72 | 12 |
| 4 | Resolution of Vectors and Unit Vectors | 72–74 | 18 |
| 5 | Analytical Vector Addition (Law of Cosines/Sines) | 74–75 | 16 |
| 6 | Motion in a Plane (Position, Velocity, Acceleration) | 76–78 | 14 |
| 7 | Motion with Constant Acceleration in a Plane | 78–79 | 12 |
| 8 | Relative Velocity in Two Dimensions | 79–80 | 16 |
| 9 | Projectile Motion | 80–82 | 26 |
| 10 | Uniform Circular Motion | 82–84 | 16 |
| | **Total** | | **150** |

Weighting rationale: Projectile (26) and Circular motion (16) are the
EAPCET heavyweights — range/height/time-of-flight and centripetal
accel/ω generate near-unlimited numerical variants. Resolution (18),
analytical addition (16), relative velocity (16) are the next tier
(component algebra, law of cosines, river/rain crossings). The pure-vector
basics (subtopics 1–3) carry less because their unique testable facts run
out faster.

## Chapter-specific notes — VISUALS (first figure-heavy chapter)
- Per INSTRUCTIONS.md §5: all main-batch questions are
  `visual: {type:"none"}` (edge function rejects svg for closed beta).
- Vector questions phrase the geometry in WORDS ("two forces of 3 and 5
  units act at 60° to each other", "a vector of magnitude 10 at 37° above
  the x-axis") — no figure needed for the vast majority.
- Projectile/circular-motion questions are fully word-describable (given
  speed, angle, g; asked range/height/time/accel).
- Genuinely figure-dependent questions ("in the figure, find the
  resultant of the shown vectors") are SKIPPED and noted in the Deferred
  svg list below for a post-renderer pass.

## Textbook anchors (verified values — use for adaptation, fresh numbers)
- Example 4.1/4.6: rain 35 m/s vertical + wind/cycle 12 m/s → R or v_rel
  = 37 m/s, angle 19° from vertical (tan⁻¹ 12/35).
- Example 4.2: R = √(A²+B²+2AB cosθ); tanα = B sinθ/(A+B cosθ). [Law of cosines/sines]
- Example 4.3: boat N 25 + current 10 @ 60° E of S → R≈22 km/h, φ≈23.4°.
- Example 4.4: r = 3tî+2t²ĵ+5k̂ → v=3î+4tĵ, a=4ĵ; at t=1 |v|=5, θ≈53°.
- Example 4.5: v₀=5î, a=3î+2ĵ; x=84 m at t=6 s, y=36 m, speed≈26 m/s.
- Example 4.8: cliff 490 m, horizontal 15 m/s, g=9.8 → t=10 s, impact 99 m/s.
- Example 4.9: 28 m/s @ 30°, g=9.8 → h=10 m, T_f=2.9 s, R=69 m.
- Example 4.10: insect R=12 cm, 7 rev/100 s → ω=0.44 rad/s, v=5.3 cm/s, a=2.3 cm/s².
- Exercise verified: 3 & 5 units @ 60° → R=7; 7 & 24 perpendicular → 25;
  P=2î+4ĵ+14k̂, Q=4î+4ĵ+10k̂ → |P+Q|=26; 45° projectile reaches 7.5 m at
  x=10 m → v₀=20 m/s; cliff 20 m @ 30°, 30 m/s, g=10 → R=60√3 m.
- Key formulae: R=v₀²sin2θ₀/g; h=v₀²sin²θ₀/2g; T_f=2v₀sinθ₀/g;
  t_m=v₀sinθ₀/g; R_max=v₀²/g at 45°; a_c=v²/R=ω²R; v=Rω; ω=2πν;
  a_c=4π²ν²R; Galileo: ranges equal for 45°±α.
- Points to Ponder p.88: projectile accel at top = g (down); UCM
  kinematic eqs don't apply (direction changing); trajectory shape depends
  on initial conditions not acceleration alone; v_12 = v_1 - v_2.

## Batch ledger (functional forms used — no repeats across batches)

### Batch 1 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Audit verdict: 10/10 math correct, ZERO fatal structural defects. Fixes
applied: Q45 + Q50 PROOF attributions rewritten (wrong-arithmetic); Q4
internal cross-ref removed ("statement-style question 3"); Q22 abandoned
fragment fixed + 5-12-13 T.A.R. added; Q31 hardened (a_y 6→8 so y=16≠x=12,
breaking the echo-the-stem coincidence). Two new INSTRUCTIONS.md lessons
(no internal cross-refs; change-the-value for pathless distractors).
Subtopic split: 4/3/4/6/5/5/4/5/9/5. Positions 13/12/12/13 (after 2 swaps).
T.A.R. exists on 15. Scrub clean (1 leak caught + fixed pre-validation).
Forms used: vector classification; |disp|≤path; equality condition; false-
statement trap; 2A magnitude; -1.5A direction; velocity×time=disp;
commutative/associative/subtraction laws; null-vector conditions trap;
|unit vector|=1; 10@37° components (8,6); |3î+4ĵ|=5; angle √3î+ĵ=30°;
equal-components=45°; |2î+3ĵ+6k̂|=7; 7&24 perp=25; 3&5@60°=7; equal
10&10@60°=10√3; |P+Q|=26; 12E+5N=13@tan⁻¹(5/12); velocity tangent;
v from r=3tî+4t²ĵ; a=8ĵ; speed 2î+t²ĵ at t=2=2√5; v_y=0 at t=0.4;
v=v₀+at; r=r₀+v₀t+½at²; drop-vs-horizontal same time; find y when x=12
(t=2,y=12); v_AB=v_A-v_B; rain-umbrella 30°; river resultant 5; cars
30E/40N rel=50; river drift 75 m; projectile accel at top=g; max range
45°; range 45°/30 m/s=90 m; max height 30°/20=5 m; T_f=2 s; horizontal
45 m/20=3 s; speed at top 60°/20=10; 40°&50° ranges 1:1; trajectory
7.5m@10m→v₀=20; centripetal dir=centre; a_c=v²/R=36; v=Rω=6; a_c=ω²R=20;
10 rev/π s, R=0.5→a_c=200.

### Batch 2 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Subtopic split: 4/3/4/6/6/5/4/6/9/3. Positions 14/11/14/11. Audit verdict:
10/10 math correct, ZERO fatal structural defects. One fix: Q37 (river
min-crossing) distractor D 48s→120s (no clean path → relative-speed
confusion) + PROOF; cosmetic: Q46 sign-convention, Q50 inverse-square
wording. Pre-validation scrub caught 5 vague-attribution PROOFs (Q17, Q27,
Q40, Q43, Q48) — fixed with clean single-error paths (one distractor value
swapped, 1.5s→-2s sign-error). Forms: scalar id; reversed-vector magnitude;
position vector; undefined ops trap; 3A; |-2A|=8; unit vector A/|A|;
triangle method; A+(-A)=0; equal-parallel difference=0; |A+B|=|A-B|→90°;
x-comp formula; 5@53°=(3,4); |6,8|=10; î+ĵ=45°; 20@60°=(10,10√3); equal-3D
comps 6√3→6; parallel 6+8=14; min-resultant 5,3=2; max-resultant 7,4=11;
equal-perp resultant dir 45°; equal vectors R=F→120°; avg-vel-def; |disp|
(2,3)→(5,7)=5; v(t²,2t)@3; a from 3tî+4ĵ=3î; v_x=0 at t=2; avg-accel-def;
x=14 from 3,4,2s; speed 5î+(3î+2ĵ) @6=26; 45°-velocity time=2; v_BA=-v_AB;
rain-runner 4,3=5; cars 25,15 rel=10; river heading 30°; aircraft 40,30=50;
river min-time 40s; horiz-vel const; 60°↔30° range; range 45°/20=40;
maxH 53°/10=3.2; t_m 30°/20=1; horiz 20m/15=30; v_y 37°/20 @1=2; maxH
30:60=1:3; cliff 30°/30/20m=60√3; period π=2s; ω 5rev/s=10π; a_c 4π²ν²R
=4π²; same-ω ratio 1:2.

### Batch 3 (50: 15 E / 25 M / 10 H) — status: COMPLETE (validated + audited + fixed)
Audit verdict: 10/10 math correct, ZERO fatal structural defects. Fixes:
Q41 distractor D 0.35s→0.23s (no clean path → wrong-cos-value path) +
PROOF; Q47 PROOF option-A attribution corrected (a_c∝v not a_c∝R). Q46
flagged Hard-plays-Medium (kept Hard to preserve 15/25/10, per Ch3
precedent). All 150 Ch4 questions verified consistent (TAR/DEEP
conclusions match keys).

### CHAPTER 4 COMPLETE: 150/150 questions, all 3 batches validated +
adversarially audited (33 agents) + all fixes applied. 30/30 Hard-question
answers verified mathematically correct; zero fatal structural defects
across the chapter. Ready for upload via admin Bulk Import.
Subtopic split: 4/2/4/6/6/4/4/5/8/7. Initially mis-built (47 q, positions
10/17/18/2 — index-3 exploitably low). Repaired: +3 questions (Vector-Add
Easy, Analytical Hard, Circular Easy), 5 scratch-text PROOFs fixed, then a
scripted option-swap + deterministic letter-remap rebalanced positions to
13/12/12/13 (all TAR/DEEP conclusions verified consistent). LESSON: track
positions WHILE writing a long batch; a one-pass 50-question write drifted
to 47 and clustered answers at 1/2.

## Deferred svg questions (post-renderer pass, forlater #47)
- (accumulates here as encountered)
