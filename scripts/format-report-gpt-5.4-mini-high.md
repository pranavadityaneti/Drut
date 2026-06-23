# OpenAI revised-format calibration report

- Model: `gpt-5.4-mini`  ·  reasoning: `high`  ·  format: B+C mix, no worked examples
- Questions: 10  ·  succeeded: 10  ·  valid JSON: 10

## Tokens per question (average)
| | input | output (incl. reasoning) | of which reasoning |
|---|---|---|---|
| avg/Q | 875 | 10715 | 9673 |

## Cost — this 10-question sample (gpt-5.4-mini)
- input 8746 tok, output 107145 tok → **$0.49** (~$0.05/question)

## Extrapolated cost for 10,000 questions (same avg tokens)
| Model | in $/1M | out $/1M | cost for 10,000 |
|---|---|---|---|
| `gpt-5.4-mini` | 0.75 | 4.5 | **$488.71** |
| `gpt-5.4` | 2.5 | 15 | **$1629.04** |
| `gpt-5.5` | 5 | 30 | **$3258.08** |

> vs. old brief format baseline: $389/10k. Detailed solutions cost more output tokens.
