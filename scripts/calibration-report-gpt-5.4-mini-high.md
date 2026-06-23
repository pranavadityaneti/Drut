# OpenAI calibration report

- Model: `gpt-5.4-mini`  ·  reasoning: `high`
- Questions requested: 20  ·  succeeded: 20  ·  valid JSON: 20

## Tokens per question (average)
| | input | output (incl. reasoning) | of which reasoning |
|---|---|---|---|
| avg/Q | 656 | 8540 | 7428 |

## Cost — this 20-question sample (gpt-5.4-mini)
- input 13125 tok, output 170800 tok → **$0.78** (~$0.04/question)

## Extrapolated cost for 10,000 questions (same avg tokens)
| Model | input $/1M | output $/1M | cost for 10,000 |
|---|---|---|---|
| `gpt-5.4-mini` | 0.75 | 4.5 | **$389.22** |
| `gpt-5.4` | 2.5 | 15 | **$1297.41** |
| `gpt-5.5` | 5 | 30 | **$2594.81** |

> Note: premium-model projections assume the SAME token counts as mini. A larger model may emit more reasoning tokens, so treat the gpt-5.4 / gpt-5.5 figures as a lower bound. The Batch API (async) would roughly halve these.
