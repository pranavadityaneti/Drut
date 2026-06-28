# OpenAI calibration report

- Model: `gpt-5.4-mini`  ·  reasoning: `medium`
- Questions requested: 20  ·  succeeded: 20  ·  valid JSON: 19

## Tokens per question (average)
| | input | output (incl. reasoning) | of which reasoning |
|---|---|---|---|
| avg/Q | 598 | 4727 | 3501 |

## Cost — this 20-question sample (gpt-5.4-mini)
- input 11965 tok, output 94546 tok → **$0.43** (~$0.02/question)

## Extrapolated cost for 10,000 questions (same avg tokens)
| Model | input $/1M | output $/1M | cost for 10,000 |
|---|---|---|---|
| `gpt-5.4-mini` | 0.75 | 4.5 | **$217.22** |
| `gpt-5.4` | 2.5 | 15 | **$724.05** |
| `gpt-5.5` | 5 | 30 | **$1448.10** |

> Note: premium-model projections assume the SAME token counts as mini. A larger model may emit more reasoning tokens, so treat the gpt-5.4 / gpt-5.5 figures as a lower bound. The Batch API (async) would roughly halve these.
