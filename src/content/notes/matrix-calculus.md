---
title: 'Matrix Calculus for Deep Learning'
description: 'Deriving Backpropagation using the numerator layout convention.'
pubDate: '2026-01-02'
tags: ['MATH', 'DL']
---

## Introduction

In deep learning, we often need to compute the gradient of a scalar loss function $L$ with respect to a weight matrix $\mathbf{W}$.

### The Scalar-by-Matrix Derivative

Let $y = \mathbf{x}^T \mathbf{W} \mathbf{x}$. The derivative is given by:

$$
\frac{\partial y}{\partial \mathbf{W}} = \mathbf{x} \mathbf{x}^T
$$

This is crucial for understanding how errors flow backward through linear layers.

### The Chain Rule

If $L = f(\mathbf{y})$ and $\mathbf{y} = \mathbf{W}\mathbf{x}$, then:

$$
\frac{\partial L}{\partial \mathbf{x}} = \mathbf{W}^T \frac{\partial L}{\partial \mathbf{y}}
$$

This elegantly avoids index hell ($\sum_{i,j,k}...$).

## Conclusion

Matrix calculus allows us to treat layers as atomic operators.