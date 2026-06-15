# Chapter 6: Work, Energy and Power — generation config

## Metadata (upload tags for Pranav)
- Subject: **Physics** | Class: **1st Year** | Board: **BIEAP**
- Chapter: **Chapter 6: Work, Energy and Power**
- Target exams: AP EAPCET + TG EAPCET (both checked)
- Source: `textbooks/Physics-I_1780686993372.pdf`, textbook pp. 120–144
  (PDF pp. 136–160; offset +16)

## Target: 150 questions | Difficulty 30/50/20 (45 E / 75 M / 30 H)
Strong numerical chapter (dot products, WE theorem, springs, power, collisions
all have genuine Easy/Medium/Hard tiers).

## Subtopic enumeration (textbook section → pages → chapter target → per-batch)

| # | Subtopic | Sections / Pages | Target | B1 | B2 | B3 |
|---|---|---|---:|---:|---:|---:|
| 1 | Scalar (Dot) Product | 6.1.1 / 120–121 | 14 | 5 | 5 | 4 |
| 2 | Work & the Work-Energy Theorem | 6.2,6.3 / 122–123 | 20 | 7 | 7 | 6 |
| 3 | Kinetic Energy | 6.4 / 123–124 | 14 | 5 | 5 | 4 |
| 4 | Work done by a Variable Force | 6.5,6.6 / 124–126 | 14 | 5 | 5 | 4 |
| 5 | Potential Energy & Conservation of Mechanical Energy | 6.7,6.8 / 126–129 | 22 | 7 | 7 | 8 |
| 6 | Potential Energy of a Spring | 6.9 / 129–131 | 14 | 5 | 5 | 4 |
| 7 | Forms of Energy & Mass-Energy Equivalence | 6.10 / 131–134 | 10 | 3 | 3 | 4 |
| 8 | Power | 6.11 / 134–135 | 18 | 6 | 6 | 6 |
| 9 | Collisions (elastic/inelastic, 1D/2D, restitution) | 6.12 / 135–138 | 24 | 7 | 7 | 10 |
| | **Total** | | **150** | **50** | **50** | **50** |

Weighting: Collisions (24) and PE/conservation (22) are EAPCET heavyweights
(restitution, 1D/2D elastic, energy-conservation cascades); Work-WE (20) and
Power (18) next. Forms-of-energy (10) is lighter (mostly recall + E=mc²).

## VISUALS — closed-beta rule (per INSTRUCTIONS.md §5)
All `visual: {type:"none"}`. Dot-product/work/spring/collision setups are fully
word-describable. Genuinely figure-dependent items (read work off an F-x graph
that must be SEEN) are SKIPPED and noted under Deferred svg — BUT most F-x graph
problems can be posed in words ("force rises linearly from 0 to 20 N over 4 m").

## Textbook anchors (verified — adapt structure, use FRESH numbers)
- Ex 6.1: F=(3,4,-5), d=(5,4,3): F·d=15+16-15=16; |F|=|d|=√50; cosθ=16/50=0.32;
  projection of F on d = F·d/|d| = 16/√50.
- Ex 6.2: raindrop 1 g from 1 km, hits at 50 m/s: ΔK=½·10⁻³·50²=1.25 J;
  Wg=mgh=10⁻³·10·10³=10 J; Wresistive=ΔK−Wg=−8.75 J.
- Ex 6.3: cyclist skids 10 m, 200 N opposing: W_road=200·10·cos180°=−2000 J;
  work by cycle on road = 0 (road has no displacement).
- Ex 6.4: bullet 50 g at 200 m/s, emerges with 10% KE: Ki=1000 J, Kf=100 J,
  vf=√(2·100/0.05)=63.2 m/s (speed cut ~68%, NOT 90%).
- Ex 6.5: trunk: 100 N over 10 m then linearly to 50 N over next 10 m;
  Wapplied=100·10+½(100+50)·10=1750 J; friction 50 N over 20 m → −1000 J.
- Ex 6.6: 1 kg, vi=2 m/s, F=−k/x (k=0.5 J) from x=0.1 to 2.01 m:
  Kf=½·1·2²−k·ln(2.01/0.1)=2−1.5=0.5 J; vf=1 m/s. (ln, not log10.)
- Ex 6.7: vertical-circle string, bob m, length L, horizontal v0 at lowest A,
  slack at top C: v0=√(5gL); vC=√(gL); vB(side)=√(3gL); KB/KC=3.
- Ex 6.8: car 1000 kg, 18 km/h=5 m/s, spring k=6.25×10³ N/m, smooth:
  K=½·1000·25=1.25×10⁴ J; xm=√(2K/k)=2.00 m.
- Ex 6.9: same with μ=0.5 → solve kxm²−2μmg·xm−mv²=0 → xm=1.35 m.
- Ex 6.10: DNA bond 10⁻²⁰J=0.06 eV; air molecule 10⁻²¹J≈6.2 meV; daily 10⁷J=2400 kcal.
- Ex 6.11: elevator 1800 kg up at 2 m/s, friction 4000 N: F=mg+f=22000 N;
  P=F·v=44000 W=59 hp. (1 hp=746 W.)
- Ex 6.12: neutron slowing, f1=((m1−m2)/(m1+m2))²; deuterium m2=2m1 → f1=1/9,
  f2=8/9; carbon f1=71.6%, f2=28.4%.
- Ex 6.13: glancing elastic, equal masses, θ2=37° → θ1=53° (sum 90°).
- Key formulae: A·B=AB cosθ=AxBx+AyBy+AzBz; W=F·d=Fd cosθ (J); K=½mv²=p²/2m;
  WE: Kf−Ki=W_net; variable force W=∫F dx (area under F-x); V_grav=mgh;
  F=−dV/dx; K+V=const (conservative); spring Fs=−kx, V=½kx²; P_avg=W/t,
  P_inst=F·v, 1 hp=746 W, 1 kWh=3.6×10⁶ J; E=mc².
  Collisions 1D elastic: v1f=((m1−m2)/(m1+m2))v1i, v2f=(2m1/(m1+m2))v1i;
  equal masses exchange velocities; m2>>m1 → v1 reverses. Inelastic:
  vf=m1v1i/(m1+m2); KE loss=½(m1m2/(m1+m2))v1i². e=(v2−v1)/(u1−u2); drop:
  e=√(h2/h1); total bounce distance = h(1+e²)/(1−e²).
- Exercise verified [Ans] (adapt, fresh numbers):
  - machine gun 360 bullets/min, 600 m/s, 5 g → P=6·½·0.005·600²=5.4 kW.
  - pump lift 600 kg/min from 25 m + eject 50 m/s → P=(mgh+½mv²)/t≈14.95 kW.
  - F=(20+5x) N, 5 kg, x=0→4 → W=∫=80+40=120 J.
  - F=−K/x², x=a→2a → W=−K/2a.
  - F-x triangle, x=−a→2a → W=3ab/2.
  - ball 20 m thrown down 20 m/s, bounces to 20 m → e=v_up/v_down=20/(20√2)=1/√2.
  - ball 10 m, e=1/√2 → total distance = 10(1+½)/(1−½)=30 m.
  - F=−î+2ĵ+3k̂, 4 m along z → W=F·d=3·4=12 J.
  - electron 10 keV vs proton 100 keV → electron faster, v ratio ≈13.5.
  - pump 30 m³/15 min, 40 m, 30% eff → P≈44 kW (g=9.8 → 43.6 kW).
  - 3 ball bearings, elastic, hit by identical at V → only result: balls 1,2
    stay, ball 3 moves at V (equal-mass exchange).
  - constant accel → P∝t; constant power → displacement ∝ t^(3/2).
- Points to Ponder (p.139): "calculate the work done" is incomplete (must name
  the force); work is a scalar (can be ±); W12+W21 need not cancel even though
  F12+F21=0; WE theorem holds in all inertial frames; PE defined up to a
  constant (zero is a choice); friction has no associated PE; KE conserved
  AFTER an elastic collision, not DURING (bodies deformed/momentarily at rest).

## Batch ledger (functional forms used — NO repeats across batches)
### Batch 1 — status: COMPLETE (validated + audited + fixed + re-audited)
Subtopic split 5/7/5/5/7/5/3/6/7. Positions 13/12/13/12. Generated from anchors
(9 subtopic agents). Audit (50-agent): 0 wrong keys, 0 math, 0 rejects; fixed 18
(5 fake T.A.R. demoted, fillers + muddled attributions corrected, 5 scratch
removed); re-audit clean (3 single-op T.A.R. demoted). T.A.R. on 14.
### Batch 2 — status: COMPLETE (validated + audited + fixed + re-audited)
Subtopic split 5/6/5/4/8/4/4/6/8. Positions 13/12/13/12. Generated as part of a
combined b2+b3 run (avoiding b1 forms), then split. Audit (50-agent): 0 wrong
keys, 0 math, 0 rejects; fixed 11 (T.A.R. demotes, attribution rewrites, fillers,
2 scratch); re-audit clean (light Q16/Q25 attribution polish). 
### Batch 3 — status: COMPLETE (validated + audited + fixed + re-audited)
Subtopic split 4/7/4/5/7/5/3/6/9. Positions 13/12/13/12. Audit (50-agent): 0
wrong keys, 0 math, 0 rejects; fixed 14 (T.A.R. demotes incl. 1 missing-shortcut
ADDED on Q18, attribution rewrites, fillers, 4 scratch); re-audit clean (Q11
label 14.0->14.4).

## CHAPTER 6 COMPLETE: 150/150 questions (B1 50 + B2 50 + B3 50), all schema-
valid, adversarially audited (6 × 50-agent passes incl. re-audits = every
question independently re-derived), all fixes applied. Combined: 45 E / 75 M /
30 H; positions 39/36/39/36; subtopic totals 14/20/14/14/22/14/10/18/24; 0
control-char/scratch/letter-consistency defects; 0 wrong keys / math errors.
(4 stems share a template opening with DIFFERENT vectors/functions/numbers/asks
— distinct instances, not true duplicates.) Ready for upload via admin Bulk
Import. Tags: Physics / 1st Year / BIEAP / Ch6 Work Energy Power / AP+TG EAPCET.

## Deferred svg questions (post-renderer pass, forlater #47)
- (accumulates here as encountered)
