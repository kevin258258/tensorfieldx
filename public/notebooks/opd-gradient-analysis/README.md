# OPD gradient analysis: verification materials

These files accompany “A Simple Analysis of OPD Gradients” / “关于 OPD 梯度的一个简单分析”. Raw CSVs, plotting code, and numerical figure metadata are preserved from the saved experiment. The public routing records retain the scientific protocol and results while omitting private infrastructure paths and operational logs.

## Reproduce the figures

Download and extract `opd-gradient-analysis-materials.zip`, retaining its directory structure. With Python, NumPy, and Matplotlib installed, run from the extracted `opd-gradient-analysis` directory:

```sh
python scripts/build_opd_blog_figures.py
```

The script reads both CSVs in `analysis/`, verifies the 256-token diagnostic, and writes PNG/SVG figures and JSON numerical summaries to `blog/assets/`. No model weights, GPU, or training execution is required. Matplotlib/font versions can affect the exact figure appearance.

## Files

- `analysis/token-norm-details.csv`: original per-token norms and student/teacher probabilities and log-probabilities.
- `analysis/entropy-lowp-overlap-8x32.csv`: per-token entropy, probability, gap, and norm diagnostics.
- `analysis/entropy-lowp-overlap-8x32.md`: ranked overlap and correlation statistics.
- `analysis/TEACHER_BRIDGE_V1_SETUP.md` and `analysis/TEACHER_BRIDGE_V1_RESULTS.md`: public routing setup and complete comparison record.
- `evaluation/`: scored samples for both trained models, protocol metadata, and grading audit.
- `blog/assets/`: both figures and their numerical metadata.

The diagnostic used an early untied BF16 loader; subsequent formal training restored embedding–output-head weight tying. Budgets sum individual-token contribution lengths before the optimizer. The routing comparison is an independently evaluated single-seed experiment.

中文说明：下载并解压材料包，保留目录结构，在 Python、NumPy、Matplotlib 环境下运行上述绘图命令即可复核图表。原始 CSV 与绘图脚本保持不变；公开实验记录保留算法、配置、指标和逐样本评分，省略私有服务器路径与运行日志。评分 CSV 不包含完整推理文本。
