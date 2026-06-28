# OpenAI DIAGRAM calibration report

- Model: `gpt-5.4-mini`  ·  reasoning: `high`
- Questions requested: 9  ·  succeeded: 9  ·  valid JSON: 9
- With SVG diagram: 9/9  ·  passing deterministic SVG checks (viewBox + closed + no forbidden tags): 9/9

## Tokens per question (average)
| | input | output (incl. reasoning) | of which reasoning |
|---|---|---|---|
| avg/Q | 996 | 32561 | 30541 |

## Cost — this 9-question sample (gpt-5.4-mini)
- input 8965 tok, output 293048 tok → **$1.33** (~$0.15/question)

## Extrapolated cost for 10,000 figure-questions (same avg tokens)
| Model | input $/1M | output $/1M | cost for 10,000 |
|---|---|---|---|
| `gpt-5.4-mini` | 0.75 | 4.5 | **$1472.71** |
| `gpt-5.4` | 2.5 | 15 | **$4909.04** |
| `gpt-5.5` | 5 | 30 | **$9818.07** |

## Per-question SVG check
| # | Subject | Subtopic | SVG | viewBox | closed | text-labels | forbidden |
|---|---|---|---|---|---|---|---|
| 1 | Physics | Image formation by a concave mirror (ray diagram) | yes | y | y | y | - |
| 2 | Physics | Block on a rough inclined plane (free-body diagram) | yes | y | y | y | - |
| 3 | Physics | Equivalent resistance of a resistor network | yes | y | y | y | - |
| 4 | Chemistry | Identify the product / feature from a skeletal structure | yes | y | y | y | - |
| 5 | Chemistry | Galvanic cell — EMF / electrode identification | yes | y | y | y | - |
| 6 | Chemistry | Atoms per unit cell from a crystal lattice diagram | yes | y | y | y | - |
| 7 | Mathematics | Circle, chord and tangent configuration | yes | y | y | y | - |
| 8 | Mathematics | Heights and distances (angles of elevation/depression) | yes | y | y | y | - |
| 9 | Mathematics | Area of the region bounded by curves | yes | y | y | y | - |

> SVGs extracted to scripts/diagram-svgs/ for visual rendering. Deterministic checks confirm structure/safety only — visual correctness and accuracy-to-problem require rendering + audit.
