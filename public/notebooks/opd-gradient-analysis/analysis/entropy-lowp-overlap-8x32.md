# Entropy × sampled-token probability overlap

High entropy and low sampled-token probability are ranked within each reported subset. Ties can make achieved fractions differ slightly from the target quantile.

## all

Tokens: **256**.

| entropy source | target tail | P(low p given high H) | P(high H given low p) | Jaccard | lift |
|---|---:|---:|---:|---:|---:|
| student | 10% | 88.46% | 88.46% | 0.793 | 8.710 |
| student | 20% | 100.00% | 100.00% | 1.000 | 4.923 |
| student | 30% | 100.00% | 100.00% | 1.000 | 3.325 |
| teacher | 10% | 46.15% | 46.15% | 0.300 | 4.544 |
| teacher | 20% | 61.54% | 61.54% | 0.444 | 3.030 |
| teacher | 30% | 80.52% | 80.52% | 0.674 | 2.677 |

| Spearman pair | rho |
|---|---:|
| student_entropy vs student_surprisal | 0.9982 |
| teacher_entropy vs student_surprisal | 0.8543 |
| student_entropy vs one_minus_student_p | 0.9982 |
| student_entropy vs score_norm | 0.9960 |
| teacher_entropy vs score_norm | 0.8572 |
| student_entropy vs residual_score_norm | 0.4612 |
| teacher_entropy vs residual_score_norm | 0.5056 |
| student_surprisal vs score_norm | 0.9979 |
| one_minus_student_p vs score_norm | 0.9979 |
| abs_gap vs score_norm | 0.9368 |
| abs_gap vs residual_score_norm | 0.5447 |
| student_entropy vs gap | -0.0102 |
| teacher_entropy vs gap | -0.2615 |

| log-norm model | value |
|---|---:|
| slope: log ||g|| ~ log(1-p) | 1.0293 |
| R² explained by log(1-p) | 0.9971 |
| std(log ||g||) | 9.4306 |
| residual std after log(1-p) | 0.5118 |

| entropy source | target tail | P(high norm given high H) | Jaccard | lift |
|---|---:|---:|---:|---:|
| student | 10% | 88.46% | 0.793 | 8.710 |
| student | 20% | 98.08% | 0.962 | 4.828 |
| student | 30% | 98.70% | 0.974 | 3.281 |
| teacher | 10% | 46.15% | 0.300 | 4.544 |
| teacher | 20% | 59.62% | 0.425 | 2.935 |
| teacher | 30% | 80.52% | 0.674 | 2.677 |

Teacher entropy >= 0.8: **1.17%**.

## gap_negative

Tokens: **103**.

| entropy source | target tail | P(low p given high H) | P(high H given low p) | Jaccard | lift |
|---|---:|---:|---:|---:|---:|
| student | 10% | 72.73% | 72.73% | 0.571 | 6.810 |
| student | 20% | 100.00% | 100.00% | 1.000 | 4.905 |
| student | 30% | 100.00% | 100.00% | 1.000 | 3.323 |
| teacher | 10% | 9.09% | 9.09% | 0.048 | 0.851 |
| teacher | 20% | 47.62% | 47.62% | 0.312 | 2.336 |
| teacher | 30% | 58.06% | 58.06% | 0.409 | 1.929 |

| Spearman pair | rho |
|---|---:|
| student_entropy vs student_surprisal | 0.9947 |
| teacher_entropy vs student_surprisal | 0.7558 |
| student_entropy vs one_minus_student_p | 0.9947 |
| student_entropy vs score_norm | 0.9923 |
| teacher_entropy vs score_norm | 0.7540 |
| student_entropy vs residual_score_norm | 0.2370 |
| teacher_entropy vs residual_score_norm | 0.2536 |
| student_surprisal vs score_norm | 0.9978 |
| one_minus_student_p vs score_norm | 0.9978 |
| abs_gap vs score_norm | 0.8577 |
| abs_gap vs residual_score_norm | 0.3630 |
| student_entropy vs gap | -0.8479 |
| teacher_entropy vs gap | -0.7568 |

| log-norm model | value |
|---|---:|
| slope: log ||g|| ~ log(1-p) | 1.0184 |
| R² explained by log(1-p) | 0.9973 |
| std(log ||g||) | 9.3966 |
| residual std after log(1-p) | 0.4879 |

| entropy source | target tail | P(high norm given high H) | Jaccard | lift |
|---|---:|---:|---:|---:|
| student | 10% | 72.73% | 0.571 | 6.810 |
| student | 20% | 95.24% | 0.909 | 4.671 |
| student | 30% | 100.00% | 1.000 | 3.323 |
| teacher | 10% | 18.18% | 0.100 | 1.702 |
| teacher | 20% | 42.86% | 0.273 | 2.102 |
| teacher | 30% | 58.06% | 0.409 | 1.929 |

Teacher entropy >= 0.8: **2.91%**.

## gap_nonnegative

Tokens: **153**.

| entropy source | target tail | P(low p given high H) | P(high H given low p) | Jaccard | lift |
|---|---:|---:|---:|---:|---:|
| student | 10% | 93.75% | 93.75% | 0.882 | 8.965 |
| student | 20% | 100.00% | 100.00% | 1.000 | 4.935 |
| student | 30% | 97.83% | 97.83% | 0.957 | 3.254 |
| teacher | 10% | 81.25% | 81.25% | 0.684 | 7.770 |
| teacher | 20% | 90.32% | 90.32% | 0.824 | 4.458 |
| teacher | 30% | 91.30% | 91.30% | 0.840 | 3.037 |

| Spearman pair | rho |
|---|---:|
| student_entropy vs student_surprisal | 0.9990 |
| teacher_entropy vs student_surprisal | 0.9263 |
| student_entropy vs one_minus_student_p | 0.9990 |
| student_entropy vs score_norm | 0.9963 |
| teacher_entropy vs score_norm | 0.9153 |
| student_entropy vs residual_score_norm | 0.4129 |
| teacher_entropy vs residual_score_norm | 0.3304 |
| student_surprisal vs score_norm | 0.9972 |
| one_minus_student_p vs score_norm | 0.9972 |
| abs_gap vs score_norm | 0.9950 |
| abs_gap vs residual_score_norm | 0.4064 |
| student_entropy vs gap | 0.9976 |
| teacher_entropy vs gap | 0.9168 |

| log-norm model | value |
|---|---:|
| slope: log ||g|| ~ log(1-p) | 1.0293 |
| R² explained by log(1-p) | 0.9971 |
| std(log ||g||) | 8.8799 |
| residual std after log(1-p) | 0.4770 |

| entropy source | target tail | P(high norm given high H) | Jaccard | lift |
|---|---:|---:|---:|---:|
| student | 10% | 93.75% | 0.882 | 8.965 |
| student | 20% | 100.00% | 1.000 | 4.935 |
| student | 30% | 97.83% | 0.957 | 3.254 |
| teacher | 10% | 81.25% | 0.684 | 7.770 |
| teacher | 20% | 90.32% | 0.824 | 4.458 |
| teacher | 30% | 89.13% | 0.804 | 2.965 |

Teacher entropy >= 0.8: **0.00%**.

## abs_gap_top20

Tokens: **52**.

| entropy source | target tail | P(low p given high H) | P(high H given low p) | Jaccard | lift |
|---|---:|---:|---:|---:|---:|
| student | 10% | 16.67% | 16.67% | 0.091 | 1.444 |
| student | 20% | 45.45% | 45.45% | 0.294 | 2.149 |
| student | 30% | 81.25% | 81.25% | 0.684 | 2.641 |
| teacher | 10% | 0.00% | 0.00% | 0.000 | 0.000 |
| teacher | 20% | 9.09% | 9.09% | 0.048 | 0.430 |
| teacher | 30% | 18.75% | 18.75% | 0.103 | 0.609 |

| Spearman pair | rho |
|---|---:|
| student_entropy vs student_surprisal | 0.8680 |
| teacher_entropy vs student_surprisal | -0.2184 |
| student_entropy vs one_minus_student_p | 0.8680 |
| student_entropy vs score_norm | 0.8526 |
| teacher_entropy vs score_norm | -0.2667 |
| student_entropy vs residual_score_norm | -0.2889 |
| teacher_entropy vs residual_score_norm | -0.2885 |
| student_surprisal vs score_norm | 0.9866 |
| one_minus_student_p vs score_norm | 0.9866 |
| abs_gap vs score_norm | 0.0895 |
| abs_gap vs residual_score_norm | 0.1467 |
| student_entropy vs gap | 0.1363 |
| teacher_entropy vs gap | 0.4284 |

| log-norm model | value |
|---|---:|
| slope: log ||g|| ~ log(1-p) | 0.9878 |
| R² explained by log(1-p) | 0.9936 |
| std(log ||g||) | 4.3571 |
| residual std after log(1-p) | 0.3476 |

| entropy source | target tail | P(high norm given high H) | Jaccard | lift |
|---|---:|---:|---:|---:|
| student | 10% | 16.67% | 0.091 | 1.444 |
| student | 20% | 36.36% | 0.222 | 1.719 |
| student | 30% | 81.25% | 0.684 | 2.641 |
| teacher | 10% | 0.00% | 0.000 | 0.000 |
| teacher | 20% | 0.00% | 0.000 | 0.000 |
| teacher | 30% | 25.00% | 0.143 | 0.812 |

Teacher entropy >= 0.8: **5.77%**.

## Reading rule

A lift near 1 means high entropy and low sampled-token probability overlap no more than chance at that tail size. A large lift with high conditional probabilities supports the claim that the two heuristics mostly select the same tokens; a modest lift leaves room for independent information.
