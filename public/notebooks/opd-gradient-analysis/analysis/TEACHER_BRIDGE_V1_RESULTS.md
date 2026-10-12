# Teacher-deficit routing v1: complete experiment record

Training and independent evaluation completed on 2026-10-10. This record publishes the scientific setup, metrics, and sample-level scoring data; local machine paths and operational logs are omitted.

## Protocol

The candidate completed 174 rollout iterations and 696 optimizer updates. Training including initialization took about 8 hours 14 minutes; the training progress timer recorded 8 hours 6 minutes. Candidate evaluation generation took 1393 seconds, about 23 minutes.

Both training runs initialize Qwen3-1.7B-Base and use the fixed Qwen3-8B teacher. The comparison baseline is the trained EOPD v4 model, rather than the untrained Base model. Shared settings and the routing rule are in [the training setup](TEACHER_BRIDGE_V1_SETUP.md).

MATH500 evaluation contains 500 questions and 8 samples per question, totaling 4000 responses per model. Generation uses a limit of 8192, temperature 1, top-p 0.8, seed 20261006, and non-thinking mode. Dataset/prompt-token hashes and sampling settings were verified equal. Saved baseline responses and newly generated candidate responses were rescored using the same Qwen2.5-Math extraction and equivalence-checking source, with zero grading errors. This is an independently audited evaluation, rather than a claim of reproducing the paper's complete evaluation pipeline; the documented dependency discrepancy is included in the scoring summary.

## Results

| Metric | EOPD v4 | Bridge v1 | Difference |
|---|---:|---:|---:|
| Avg@8: mean correctness over 4000 responses | 68.275% | 67.900% | -0.375 percentage points |
| Pass@8: questions with at least one correct response | 87.60% | 86.40% | -1.20 percentage points |
| Correct responses | 2731/4000 | 2716/4000 | -15 |
| Questions passed | 438/500 | 432/500 | -6 |
| Mean response tokens | 1236.996 | 1227.939 | -9.057 |
| Truncation rate | 3.525% | 3.225% | -0.300 percentage points |
| Complete boxed-answer fraction | 96.650% | 96.875% | +0.225 percentage points |

Paired question-level Pass@8 transitions: both pass 416, neither passes 46, baseline-only passes 22, candidate-only passes 16. These initial single-seed results provide a starting point for further recipient-rule and routing-budget experiments. RouteOPD's separate reported positive results concern a different pairwise objective and adaptive-budget design.

## Numerical and training checks

All 174 iterations had finite metrics; the final checkpoint and export were verified, with no training OOM. Final-iteration metrics were: eligible routing positions 27.729%, negative-advantage positions 29.781%, teacher top16 captured mass 99.806%, pre-clipping parameter gradient norm 2.981, policy surrogate value 0.6265, auxiliary FKL 0.05283. Mean training response length was 1026.23 tokens, with 3.125% truncation at the 4096 training limit.

Routing fractions average microbatch statistics; eligibility does not yet exclude zero upstream derivatives due to PPO clipping. The unchanged forward surrogate is a diagnostic value, rather than the scalar objective of the custom backward or the actual Adam parameter displacement.

## Downloadable scoring data

- [EOPD v4: all 4000 scored samples](../evaluation/eopd-v4-qwen25.csv)
- [Teacher bridge v1: all 4000 scored samples](../evaluation/teacher-bridge-v1-qwen25.csv)
- [Protocol metadata](../evaluation/comparison-protocol.json)
- [Scoring source hashes, dependencies, summaries, and paired transitions](../evaluation/qwen25-summary.json)

The CSV files contain question identifiers, sample indices, extracted answers, correctness flags, response lengths, and stop/truncation reasons. They do not contain the full generated reasoning text. The label `base` in the scoring summary means the trained EOPD v4 baseline; `final` means the routing candidate.
