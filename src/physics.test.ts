import { describe, expect, it } from 'vitest';
import { EARTH_DAYS, J2000_ELEMENTS, planets, periodYears } from './data';
import { SimulationClock, TAU, bodyScales, eccentricAnomaly, fitView, initialMeanAnomaly, orbitBasis, orbitOf, position, projectedOrbit } from './physics';

const earth = planets.find(p => p.id === 'earth')!;
const pluto = planets.find(p => p.id === 'pluto')!;
const neptune = planets.find(p => p.id === 'neptune')!;
const uranus = planets.find(p => p.id === 'uranus')!;

describe('simulation time', () => {
  it.each([1, 10, 100])('advances one Earth year in %i seconds and completes an orbit', seconds => {
    const clock = new SimulationClock();
    clock.setSpeed(seconds, 0); clock.setRunning(true, 0);
    expect(clock.tick(seconds * 1000)).toBeCloseTo(1, 12);
    expect(position(earth, clock.years, false).x).toBeCloseTo(3, 10);
    expect(position(earth, clock.years, false).y).toBeCloseTo(0, 10);
  });
  it('settles the previous speed when changing speed between frames', () => {
    const clock = new SimulationClock(); clock.setRunning(true, 0);
    clock.setSpeed(1, 5000);
    expect(clock.years).toBeCloseTo(0.5);
    expect(clock.tick(6000)).toBeCloseTo(1.5);
  });
  it('pauses and resumes without accruing paused time', () => {
    const clock = new SimulationClock(); clock.setRunning(true, 0);
    clock.setRunning(false, 2500); clock.tick(100000);
    expect(clock.years).toBeCloseTo(0.25);
    clock.setRunning(true, 200000);
    expect(clock.tick(202500)).toBeCloseTo(0.5);
  });
  it('excludes hidden time while preserving the play state', () => {
    const clock = new SimulationClock(); clock.setRunning(true, 0);
    clock.setHidden(true, 1000); clock.setHidden(false, 501000);
    expect(clock.running).toBe(true);
    expect(clock.tick(502000)).toBeCloseTo(0.2);
  });
  it('resets time and play state while retaining speed', () => {
    const clock = new SimulationClock(); clock.setSpeed(25, 0); clock.setRunning(true, 0); clock.tick(5000);
    clock.reset(5000);
    expect(clock.years).toBe(0); expect(clock.running).toBe(false); expect(clock.secondsPerYear).toBe(25);
  });
  it.each([0, 101, 3.2, NaN])('rejects invalid speed %s', value => {
    const clock = new SimulationClock(); expect(clock.setSpeed(value, 0)).toBe(false); expect(clock.secondsPerYear).toBe(10);
  });
});

describe('orbital geometry', () => {
  it('starts all bodies on the right at zero degrees in both modes', () => {
    for (const real of [false, true]) for (const p of planets) {
      const point = position(p, 0, real);
      expect(point.x).toBeGreaterThan(0); expect(point.y).toBeCloseTo(0, 10);
    }
  });
  it('uses equidistant circles when OFF and J2000 elements when ON, with the same periods', () => {
    expect(planets.slice(0, 8).map(p => orbitOf(p, false).a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const p of planets.slice(0, 8)) {
      expect(orbitOf(p, true).a).toBe(p.axisAU);
      expect(orbitOf(p, true)).toEqual(J2000_ELEMENTS[p.id]);
      expect(orbitOf(p, true).e).toBeGreaterThan(0);
      for (const real of [false, true]) {
        const start = position(p, 0.03, real), end = position(p, 0.03 + periodYears(p), real);
        expect(end.x).toBeCloseTo(start.x, 8); expect(end.y).toBeCloseTo(start.y, 8);
      }
    }
    expect(periodYears(earth)).toBe(1); expect(earth.periodDays).toBe(EARTH_DAYS);
  });
  it('places schematic Pluto at both apsides and crosses Neptune twice', () => {
    const real = false;
    const { a, e } = orbitOf(pluto, real);
    const n = orbitOf(neptune, real).a;
    expect(a * (1 - e)).toBeLessThan(n); expect(a * (1 + e)).toBeGreaterThan(n);
    const q = position(pluto, 0, real);
    const Q = position(pluto, periodYears(pluto) / 2, real);
    expect(q.x).toBeCloseTo(a * (1 - e), 8); expect(Q.x).toBeCloseTo(-a * (1 + e), 8);
    expect(Q.y).toBeCloseTo(0, 8);
    const cosE = (1 - n / a) / e;
    expect(Math.abs(cosE)).toBeLessThan(1);
    for (const E of [Math.acos(cosE), TAU - Math.acos(cosE)]) {
      const years = (E - e * Math.sin(E)) / TAU * periodYears(pluto);
      const p = position(pluto, years, real);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(n, 8);
    }
  });
  it.each([false, true])('keeps Pluto outside Uranus throughout its orbit (real=%s)', real => {
    const uranusOrbit = orbitOf(uranus, real);
    const uranusRadius = uranusOrbit.a * (1 + uranusOrbit.e);
    const { a, e } = orbitOf(pluto, real);
    expect(a * (1 - e)).toBeGreaterThan(uranusRadius);
    for (let step = 0; step <= 720; step++) {
      const point = position(pluto, periodYears(pluto) * step / 720, real);
      expect(Math.hypot(point.x, point.y)).toBeGreaterThan(uranusRadius);
    }
  });
  it('solves Kepler’s equation and moves faster at perihelion', () => {
    for (const m of [0, 0.001, 1, 3, 5.9, TAU]) {
      const E = eccentricAnomaly(m, 0.25);
      expect(E - 0.25 * Math.sin(E)).toBeCloseTo(m % TAU, 9);
    }
    const dt = 0.001, T = periodYears(pluto);
    const M0 = initialMeanAnomaly(orbitOf(pluto, true));
    const atMean = (mean: number) => ((mean - M0 + TAU) % TAU) / TAU * T;
    const distance = (t: number) => { const a = position(pluto, t, true), b = position(pluto, t + dt, true); return Math.hypot(a.x - b.x, a.y - b.y); };
    expect(distance(atMean(0))).toBeGreaterThan(distance(atMean(Math.PI)));
  });
  it('projects a tilted, rotated orbit with the expected center and bounds', () => {
    const ellipse = projectedOrbit({ a: 2, e: 0.5, inclination: 60, ascendingNode: 90, perihelionLongitude: 90 });
    expect(ellipse.center.x).toBeCloseTo(0, 10); expect(ellipse.center.y).toBeCloseTo(-1, 10);
    expect(ellipse.radiusX).toBeCloseTo(2, 10); expect(ellipse.radiusY).toBeCloseTo(Math.sqrt(3) / 2, 10);
    expect(ellipse.minX).toBeCloseTo(-Math.sqrt(3) / 2, 10); expect(ellipse.maxX).toBeCloseTo(Math.sqrt(3) / 2, 10);
    expect(ellipse.minY).toBeCloseTo(-3, 10); expect(ellipse.maxY).toBeCloseTo(1, 10);
  });
  it('places every moving body on the same projected ellipse used by the renderer', () => {
    for (const real of [false, true]) for (const planet of planets) {
      const ellipse = projectedOrbit(orbitOf(planet, real));
      const c = Math.cos(ellipse.rotation), s = Math.sin(ellipse.rotation);
      for (let i = 0; i < 72; i++) {
        const point = position(planet, periodYears(planet) * i / 72, real);
        const dx = point.x - ellipse.center.x, dy = point.y - ellipse.center.y;
        expect(((dx * c + dy * s) / ellipse.radiusX) ** 2 + ((-dx * s + dy * c) / ellipse.radiusY) ** 2).toBeCloseTo(1, 8);
      }
    }
  });
  it('honors the physical perihelion direction and scale of each real orbit', () => {
    for (const planet of planets) {
      const orbit = orbitOf(planet, true), { u } = orbitBasis(orbit);
      const M0 = initialMeanAnomaly(orbit);
      const years = ((-M0 + TAU) % TAU) / TAU * periodYears(planet);
      const point = position(planet, years, true);
      expect(point.x).toBeCloseTo(orbit.a * (1 - orbit.e) * u.x, 8);
      expect(point.y).toBeCloseTo(orbit.a * (1 - orbit.e) * u.y, 8);
      const start = position(planet, 0, true), next = position(planet, 0.001, true);
      expect(start.x * next.y - start.y * next.x).toBeGreaterThan(0);
    }
  });
  it('keeps two intersections between the projected real Pluto and Neptune orbits', () => {
    const n = projectedOrbit(orbitOf(neptune, true));
    const c = Math.cos(n.rotation), s = Math.sin(n.rotation);
    const side = (years: number) => {
      const p = position(pluto, years, true), dx = p.x - n.center.x, dy = p.y - n.center.y;
      return ((dx * c + dy * s) / n.radiusX) ** 2 + ((-dx * s + dy * c) / n.radiusY) ** 2 - 1;
    };
    let crossings = 0, previous = side(0);
    for (let i = 1; i <= 4096; i++) {
      const current = side(periodYears(pluto) * i / 4096);
      if (current * previous < 0) crossings++;
      previous = current;
    }
    expect(crossings).toBe(2);
  });
  it('fits entire off-center Pluto ellipse on narrow and wide screens', () => {
    for (const [w, h] of [[320, 420], [1400, 900]]) for (const real of [false, true]) {
      const fit = fitView(w, h, real, true);
      for (const p of planets) for (let step = 0; step < 100; step++) {
        const v = position(p, periodYears(p) * step / 100, real);
        expect(fit.center.x + v.x * fit.scale).toBeGreaterThan(20);
        expect(fit.center.x + v.x * fit.scale).toBeLessThan(w - 20);
        expect(fit.center.y - v.y * fit.scale).toBeGreaterThan(20);
        expect(fit.center.y - v.y * fit.scale).toBeLessThan(h - 20);
      }
    }
  });
  it('shrinks overlapping bodies without enlarging distant ones and restores base sizes', () => {
    const bodies = [{ x: 0, y: 0, radius: 10 }, { x: 5, y: 0, radius: 10 }, { x: 200, y: 200, radius: 20 }];
    const scales = bodyScales(bodies);
    expect(scales[0]).toBeLessThan(1); expect(scales[2]).toBe(1);
    expect(10 * scales[0] + 10 * scales[1]).toBeLessThanOrEqual(5);
    expect(bodyScales(bodies.map(b => ({ ...b, x: b.x * 10 })))).toEqual([1, 1, 1]);
  });
});
