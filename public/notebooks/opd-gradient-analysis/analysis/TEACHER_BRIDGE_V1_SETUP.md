# Teacher-deficit routing v1: training setup

This is a negative-advantage gradient-routing prototype built on the EOPD v4 baseline, rather than a reproduction of RouteOPD. Both runs start from the same original Qwen3-1.7B-Base student; the fixed teacher is Qwen3-8B. Training completed on 2026-10-10.

## Update rule

Let p be the current student, q the fixed teacher, p_old the rollout student, and y the sampled token. The detached credit signal is A = log q_y - log p_old,y, with the original PPO ratio and clipping. For A >= 0, the ordinary score gradient e_y - p is retained.

For A < 0, the source score coordinate stays 1-p_y. The stop-token set is E = {151643, 151645}. If y is a stop token, the ordinary update is retained. Otherwise, all stop score coordinates remain -p_E. The routable budget is b = 1-p_y - sum_E p_E. Recipients have D_j proportional to (q_j-p_j)_+, normalized within the teacher's top16, excluding y and stop tokens.

With full routing, the score Jacobian has source coordinate 1-p_y, stop coordinates -p_E, and other coordinates -bD. It is multiplied by the upstream derivative of the PPO loss and enters normal full-parameter backpropagation. If no eligible teacher deficit exists, the ordinary score gradient is used.

The custom score's forward value stays equal to logp, but its backward is changed. The reported policy surrogate is thus a diagnostic value, not a scalar objective whose ordinary derivative produces this update. Auxiliary FKL and entropy branches retain normal autograd. No norm division, residual division, OT objective, new reward, or EOS target change is used.

Teacher top16 probabilities use the full-vocabulary logsumexp denominator. They are scored once per rollout and cached; student deficits are refreshed on each forward. Routing therefore covers top16 teacher candidates, rather than all vocabulary deficits. Eligible routing fractions are averages of microbatch statistics before excluding zero upstream derivatives caused by PPO clipping.

## Shared configuration

- Two A800 80GB GPUs; full-parameter student training.
- MATH training set; rollout batch 128, minibatch 32, PPO epochs 1.
- Three dataset epochs, 174 rollout iterations, 696 optimizer updates.
- AdamW learning rate 3e-6, cosine decay to zero, weight decay 0.01, global gradient clipping at 1.
- route_fraction = 1 for the routing prototype.
- Both models use non-thinking templates; training prompt limit 1024 and response limit 4096.
- Training sampling: temperature 1, top-p 1, top-k -1.
- EOPD auxiliary teacher FKL top16, entropy threshold 0.8, coefficient 1, retained from v4.
- vLLM async rollouts, FSDP with padded SDPA, per-GPU microbatch 1, chunked entropy.

## Validation and evaluation

Eight independent gradient checks covered recipient direction and source budget, stop coordinates, recovery of the ordinary gradient at zero routing, PPO-clipped zero updates, unchanged positive-credit and sampled-stop branches, teacher normalization, shared parameters and auxiliary branches, and fallback without deficits. CUDA BF16 backward validation at upstream scale 128 passed; maximum absolute score-gradient error was 0.000374913.

Independent evaluation uses MATH500: 500 questions, 8 samples each, response limit 8192, temperature 1, top-p 0.8, generation seed 20261006, non-thinking. Dataset and prompt-token hashes and sampling configuration match between the runs. Both answer sets were regraded with the same Qwen2.5-Math extraction and equivalence-checking source. Dependency details are provided in [the scoring summary](../evaluation/qwen25-summary.json).

See [the complete result record](TEACHER_BRIDGE_V1_RESULTS.md).
