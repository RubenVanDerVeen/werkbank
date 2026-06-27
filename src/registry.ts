import type { Module } from './module.ts';
import { module as transferFn } from './modules/transfer-fn/module.ts';
import { module as pidTuner } from './modules/pid-tuner/module.ts';

export const modules: Module[] = [transferFn, pidTuner];
