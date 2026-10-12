"""Reproduce blog figures from the saved exploratory token diagnostic."""
import csv
import hashlib
import json
import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/gradient-guide-blog-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

project = Path(__file__).resolve().parents[1]
source = project/'analysis/token-norm-details.csv'
rows = list(csv.DictReader(source.open()))
assert len(rows) == 256
residual = np.array([-np.expm1(float(r['student_logp'])) for r in rows])
norm = np.array([float(r['norm']) for r in rows])
H = norm/residual
assert np.isfinite(H).all() and (residual > 0).all()
output = project/'blog/assets'
output.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.size':11, 'axes.spines.top':False, 'axes.spines.right':False,
                     'savefig.facecolor':'white', 'font.family':'DejaVu Sans'})
fig, axes = plt.subplots(1,2,figsize=(11,4.5),layout='constrained')
grid = np.geomspace(residual.min(),residual.max(),200)
lo,med,hi = np.quantile(H,[.05,.5,.95])
axes[0].fill_between(grid,lo*grid,hi*grid,color='#bad6ec',alpha=.5,
                     label='5–95% residual-norm band × (1−p)')
axes[0].plot(grid,med*grid,color='#1c547c',linewidth=1.2,label='Median residual norm × (1−p)')
axes[0].scatter(residual,norm,s=17,c='#1c547c',alpha=.7,edgecolors='none')
axes[0].set(xscale='log',yscale='log',xlabel='Softmax residual 1−p',
            ylabel='Full-parameter score norm ‖∇ log p‖',title='Score norm spans many orders of magnitude')
axes[0].legend(loc='upper left',fontsize=8,frameon=False)
axes[1].scatter(residual,H,s=17,c='#946024',alpha=.75,edgecolors='none')
axes[1].axhline(med,c='#946024',linewidth=1.2)
axes[1].axhspan(lo,hi,color='#f1dfbb',alpha=.55,zorder=0)
axes[1].set(xscale='log',yscale='log',xlabel='Softmax residual 1−p',
            ylabel='Residual norm ‖∇ log odds‖',ylim=(100,10000),
            title='Removing 1−p leaves a narrower, variable scale')
for ax in axes:
    ax.grid(alpha=.16,which='major')
fig.suptitle('Exploratory diagnostic: 8 short arithmetic responses, 256 tokens',fontsize=12)
fig.savefig(output/'score-norm-decomposition.png',dpi=180)
fig.savefig(output/'score-norm-decomposition.svg')
plt.close(fig)
x,y=np.log10(residual),np.log10(norm)
slope,intercept=np.polyfit(x,y,1)
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'tokens':len(rows),
        'parameterization_note':'Early untied BF16 loader; not the final tied FP32 training model.',
        'score_norm_range':[float(norm.min()),float(norm.max())],
        'residual_norm_quantiles':{'p05':float(lo),'median':float(med),'p95':float(hi)},
        'log_regression_slope':float(slope),
        'log_regression_r2':float(1-np.var(y-(slope*x+intercept))/np.var(y))}
(output/'figure-source.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

selection_source = project/'analysis/entropy-lowp-overlap-8x32.csv'
selected_rows = list(csv.DictReader(selection_source.open()))
entropy = np.array([float(r['student_entropy']) for r in selected_rows])
sampled_p = np.array([float(r['student_p']) for r in selected_rows])
score_norm = np.array([float(r['score_norm']) for r in selected_rows])
gap_abs = np.array([abs(float(r['gap'])) for r in selected_rows])
high_entropy = entropy >= np.quantile(entropy,.8)
low_p = sampled_p <= np.quantile(sampled_p,.2)
high_norm = score_norm >= np.quantile(score_norm,.8)
selection_report = {
    'source_sha256':hashlib.sha256(selection_source.read_bytes()).hexdigest(),
    'tokens':len(selected_rows), 'target_fraction':.2,
    'selected_counts':{'high_entropy':int(high_entropy.sum()), 'low_probability':int(low_p.sum()),
                       'high_score_norm':int(high_norm.sum())},
    'entropy_lowp_overlap':float((high_entropy & low_p).sum()/high_entropy.sum()),
    'entropy_highnorm_overlap':float((high_entropy & high_norm).sum()/high_entropy.sum()),
    'retained_score_norm_sum_fraction':float(score_norm[high_entropy].sum()/score_norm.sum()),
    'retained_gap_weighted_norm_sum_fraction':float((gap_abs*score_norm)[high_entropy].sum()/(gap_abs*score_norm).sum()),
    'budget_definition':'sum of individual token contribution lengths, before loss reduction and optimizer',
}
(output/'token-selection-statistics.json').write_text(json.dumps(selection_report,indent=2)+'\n')
print(json.dumps(selection_report,indent=2))

# Illustrative direct-logit SGD, not a measured language-model parameter step.
p = np.array([.7,.2,.1])
q = np.array([.2,.75,.05])
effective_step = .2
ordinary = np.array([.7,.2,-.9])
routed = np.array([0,.9,-.9])
def softmax(z):
    values = np.exp(z-z.max())
    return values/values.sum()
after_ordinary = softmax(np.log(p)+effective_step*ordinary)
after_routed = softmax(np.log(p)+effective_step*routed)
fig, axes = plt.subplots(1,2,figsize=(10,4.1),layout='constrained')
x=np.arange(3)
width=.26
axes[0].bar(x-width/2,effective_step*ordinary,width,color='#1c547c',label='Ordinary negative credit')
axes[0].bar(x+width/2,effective_step*routed,width,color='#946024',label='Teacher-deficit recipients')
axes[0].axhline(0,color='#666666',linewidth=.8)
axes[0].set(ylabel='Prescribed logit change')
axes[0].set_title('Source suppression is unchanged',fontsize=12)
axes[1].bar(x-width,effective_step*0+p,width,color='#a8b1b9',label='Before')
axes[1].bar(x,after_ordinary,width,color='#1c547c',label='Ordinary negative credit')
axes[1].bar(x+width,after_routed,width,color='#946024',label='Teacher-deficit recipients')
axes[1].set(ylabel='Probability after softmax',ylim=(0,.85))
axes[1].set_title('A higher logit can mean a lower probability',fontsize=12)
for ax in axes:
    ax.set_xticks(x,['a: student head','b: teacher deficit','y: sampled source'])
    ax.tick_params(axis='x',labelsize=9)
    ax.legend(frameon=False,fontsize=8,loc='lower left' if ax is axes[0] else 'upper right')
fig.suptitle('Illustration: p=(0.70, 0.20, 0.10), q=(0.20, 0.75, 0.05), effective step=0.20',fontsize=11)
fig.savefig(output/'squeezing-and-preference.png',dpi=180,bbox_inches='tight')
fig.savefig(output/'squeezing-and-preference.svg',bbox_inches='tight')
plt.close(fig)
(output/'squeezing-example.json').write_text(json.dumps({
    'kind':'illustrative direct-logit SGD; no neural network or optimizer preconditioning',
    'student':p.tolist(),'teacher':q.tolist(),'effective_step':effective_step,
    'ordinary_logit_change':(effective_step*ordinary).tolist(),
    'routed_logit_change':(effective_step*routed).tolist(),
    'ordinary_after':after_ordinary.tolist(),'routed_after':after_routed.tolist()},indent=2)+'\n')
