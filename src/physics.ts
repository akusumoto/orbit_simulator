import { J2000_ELEMENTS, planets, periodYears } from './data';
import type { OrbitalElements, Planet } from './data';

export interface Point { x: number; y: number }
export type Orbit = OrbitalElements;
export const TAU = Math.PI * 2;
// a=9: perihelion=7.5 stays outside Uranus (7), while still crossing Neptune (8).
export const SCHEMATIC_PLUTO_ECCENTRICITY = 1 / 6;
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function orbitOf(p: Planet, real: boolean): Orbit {
  if (real) return J2000_ELEMENTS[p.id];
  return {
    a: planets.indexOf(p) + 1,
    e: p.id === 'pluto' ? SCHEMATIC_PLUTO_ECCENTRICITY : 0,
    inclination: 0, perihelionLongitude: 0, ascendingNode: 0,
  };
}

/** Perifocal axes projected onto the J2000 ecliptic plane (viewed from the north). */
export function orbitBasis(orbit: Orbit) {
  const radians = Math.PI / 180;
  const node = orbit.ascendingNode * radians;
  const omega = (orbit.perihelionLongitude - orbit.ascendingNode) * radians;
  const ci = Math.cos(orbit.inclination * radians);
  const cn = Math.cos(node), sn = Math.sin(node), cw = Math.cos(omega), sw = Math.sin(omega);
  return {
    u: { x: cw * cn - sw * sn * ci, y: cw * sn + sw * cn * ci },
    v: { x: -sw * cn - cw * sn * ci, y: -sw * sn + cw * cn * ci },
  };
}

/** Choose phase so every projected orbit starts on the positive screen x-axis. */
export function initialMeanAnomaly(orbit: Orbit) {
  const { u, v } = orbitBasis(orbit);
  const trueAnomaly = Math.atan2(-u.y, v.y);
  const E = 2 * Math.atan2(Math.sqrt(1 - orbit.e) * Math.sin(trueAnomaly / 2), Math.sqrt(1 + orbit.e) * Math.cos(trueAnomaly / 2));
  return E - orbit.e * Math.sin(E);
}

export function projectedOrbit(orbit: Orbit) {
  const { u, v } = orbitBasis(orbit);
  const b = orbit.a * Math.sqrt(1 - orbit.e * orbit.e);
  const axisU = { x: orbit.a * u.x, y: orbit.a * u.y };
  const axisV = { x: b * v.x, y: b * v.y };
  const center = { x: -orbit.a * orbit.e * u.x, y: -orbit.a * orbit.e * u.y };
  const xx = axisU.x ** 2 + axisV.x ** 2, yy = axisU.y ** 2 + axisV.y ** 2;
  const xy = axisU.x * axisU.y + axisV.x * axisV.y;
  const delta = Math.hypot(xx - yy, 2 * xy);
  return {
    center, axisU, axisV,
    radiusX: Math.sqrt((xx + yy + delta) / 2),
    radiusY: Math.sqrt(Math.max(0, (xx + yy - delta) / 2)),
    rotation: Math.atan2(2 * xy, xx - yy) / 2,
    minX: center.x - Math.sqrt(xx), maxX: center.x + Math.sqrt(xx),
    minY: center.y - Math.sqrt(yy), maxY: center.y + Math.sqrt(yy),
  };
}

export function eccentricAnomaly(mean: number, e: number): number {
  const m = ((mean % TAU) + TAU) % TAU;
  let E = m;
  for (let i = 0; i < 12; i++) {
    const delta = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return E;
}

export function position(p: Planet, years: number, real: boolean): Point {
  const orbit = orbitOf(p, real);
  const mean = initialMeanAnomaly(orbit) + TAU * ((years / periodYears(p)) % 1);
  const E = eccentricAnomaly(mean, orbit.e);
  const { u, v } = orbitBasis(orbit);
  const x = orbit.a * (Math.cos(E) - orbit.e), y = orbit.a * Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(E);
  return { x: u.x * x + v.x * y, y: u.y * x + v.y * y };
}

export function fitView(width: number, height: number, real: boolean, pluto: boolean) {
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const p of planets.filter(p => pluto || p.id !== 'pluto')) {
    const projected = projectedOrbit(orbitOf(p, real));
    minX = Math.min(minX, projected.minX); maxX = Math.max(maxX, projected.maxX);
    minY = Math.min(minY, projected.minY); maxY = Math.max(maxY, projected.maxY);
  }
  const marginX = Math.min(72, width * 0.18);
  const top = Math.min(90, height * 0.22);
  // Narrow panels stack the toolbar above the legend. Reserve that actual space.
  const bottom = width < 600 ? Math.min(155, height * 0.43) : top;
  const scale = Math.max(0.1, Math.min((width - 2 * marginX) / (maxX - minX), (height - top - bottom) / (maxY - minY)));
  return { scale, center: { x: width / 2 - (maxX + minX) / 2 * scale, y: (height + top - bottom) / 2 + (maxY + minY) / 2 * scale } };
}

/** Keep the largest safe individual sizes; never impose a minimum that reintroduces overlap. */
export function bodyScales(bodies: { x: number; y: number; radius: number }[]) {
  const scales = bodies.map(() => 1);
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y);
    const ratio = Math.min(1, d / (bodies[i].radius + bodies[j].radius + 2));
    scales[i] = Math.min(scales[i], ratio);
    scales[j] = Math.min(scales[j], ratio);
  }
  return scales;
}

/** All setting transitions settle the old interval before applying the new value. */
export class SimulationClock {
  years = 0;
  running = false;
  secondsPerYear = 10;
  hidden = false;
  private last: number | null = null;

  tick(now: number) {
    if (this.last !== null && this.running && !this.hidden) {
      this.years += Math.max(0, now - this.last) / 1000 / this.secondsPerYear;
    }
    this.last = now;
    return this.years;
  }
  setRunning(value: boolean, now: number) { this.tick(now); this.running = value; }
  setSpeed(value: number, now: number) {
    if (!Number.isInteger(value) || value < 1 || value > 100) return false;
    this.tick(now); this.secondsPerYear = value; return true;
  }
  setHidden(value: boolean, now: number) { this.tick(now); this.hidden = value; }
  reset(now: number) { this.years = 0; this.running = false; this.last = now; }
}
