import type { Module } from './module.ts';
import { module as transferFn } from './modules/transfer-fn/module.ts';
import { module as pidTuner } from './modules/pid-tuner/module.ts';
import { module as routhHurwitz } from './modules/routh-hurwitz/module.ts';
import { module as fourierSeries } from './modules/fourier-series/module.ts';
import { module as bjtAmp } from './modules/bjt-amp/module.ts';
import { module as bjtDc } from './modules/bjt-dc/module.ts';
import { module as diodeShaping } from './modules/diode-shaping/module.ts';
import { module as fetAmp } from './modules/fet-amp/module.ts';
import { module as opamp } from './modules/opamp/module.ts';
import { module as multistage } from './modules/multistage/module.ts';
import { module as diffAmp } from './modules/diff-amp/module.ts';
import { module as feedback } from './modules/feedback/module.ts';
import { module as freqResponse } from './modules/freq-response/module.ts';

export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse];
