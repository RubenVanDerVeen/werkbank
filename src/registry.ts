import type { Module } from './module.ts';
import { module as transferFn } from './modules/transfer-fn/module.ts';
import { module as pidTuner } from './modules/pid-tuner/module.ts';
import { module as routhHurwitz } from './modules/routh-hurwitz/module.ts';
import { module as fourierSeries } from './modules/fourier-series/module.ts';

export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries];
