export const EPS0 = 8.854187817e-12;
export const K = 1 / (4 * Math.PI * EPS0);

export interface Pt { x: number; y: number; }
export interface Vec { Ex: number; Ey: number; }
export interface Charge { q: number; at: Pt; }

export function pointChargeField(q: number, at: Pt, observer: Pt): Vec {
  const dx = observer.x - at.x;
  const dy = observer.y - at.y;
  const r2 = dx * dx + dy * dy;
  if (r2 === 0) throw new Error('observer coincides with charge');
  const f = K * q / (r2 * Math.sqrt(r2));
  return { Ex: f * dx, Ey: f * dy };
}

export function pointChargePotential(q: number, at: Pt, observer: Pt): number {
  const dx = observer.x - at.x;
  const dy = observer.y - at.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r === 0) throw new Error('observer coincides with charge');
  return K * q / r;
}

export function superposeField(charges: Charge[], observer: Pt): Vec {
  let Ex = 0, Ey = 0;
  for (const c of charges) {
    const E = pointChargeField(c.q, c.at, observer);
    Ex += E.Ex; Ey += E.Ey;
  }
  return { Ex, Ey };
}

export function superposePotential(charges: Charge[], observer: Pt): number {
  let V = 0;
  for (const c of charges) V += pointChargePotential(c.q, c.at, observer);
  return V;
}

export type CapType = 'plate' | 'coax' | 'sphere';

export interface CapParams {
  A?: number; d?: number; // plate: area (m²), separation (m)
  L?: number; a?: number; b?: number; // coax: length, inner radius, outer radius (m)
  r?: number; // sphere: radius (m)
}

export function capacitance(type: CapType, p: CapParams): number {
  switch (type) {
    case 'plate': {
      const d = p.d ?? 0;
      if (d <= 0) throw new Error('plate: d must be > 0');
      return EPS0 * (p.A ?? 0) / d;
    }
    case 'coax': {
      const a = p.a ?? 0, b = p.b ?? 0;
      if (b <= a) throw new Error('coax: b must be > a');
      return 2 * Math.PI * EPS0 * (p.L ?? 0) / Math.log(b / a);
    }
    case 'sphere':
      return 4 * Math.PI * EPS0 * (p.r ?? 0);
  }
}

export type GaussType = 'sphere' | 'cylinder' | 'plane';

export interface GaussParams {
  Q?: number;       // sphere: total charge (C)
  lambda?: number;  // cylinder: line charge density (C/m)
  sigma?: number;   // plane: surface charge density (C/m²)
}

export function gaussField(type: GaussType, p: GaussParams, r: number): number {
  switch (type) {
    case 'sphere': {
      if (r <= 0) throw new Error('r must be > 0');
      return K * (p.Q ?? 0) / (r * r);
    }
    case 'cylinder': {
      if (r <= 0) throw new Error('r must be > 0');
      return (p.lambda ?? 0) / (2 * Math.PI * EPS0 * r);
    }
    case 'plane':
      // ponytail: r unused; plane field is uniform, signature kept for consistency
      return (p.sigma ?? 0) / (2 * EPS0);
  }
}
