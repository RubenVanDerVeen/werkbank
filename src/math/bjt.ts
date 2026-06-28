export type Config = 'CE' | 'CB' | 'CC';

export function hybridPi(beta: number, ICmA: number, VTmV: number): { gm_mS: number; rpi_kOhm: number } {
  const gm = (1000 * ICmA) / VTmV; // mA/mV = S, ×1000 → mS
  const rpi = beta / gm; // kΩ (β / mS = kΩ)
  return { gm_mS: gm, rpi_kOhm: rpi };
}
