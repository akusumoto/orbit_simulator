import { planets, texturePath } from './data';
import type { Planet } from './data';
import { SimulationClock, bodyScales, clamp, fitView, orbitOf, position, projectedOrbit, TAU } from './physics';
import type { Point } from './physics';

export interface SceneCallbacks {
  onSelect: (id: string | null) => void;
  onTime: (years: number) => void;
  onView: (zoom: number) => void;
  onAssets: (loading: boolean, failures: string[]) => void;
}
interface Hit { id: string; x: number; y: number; radius: number; label?: Rect }
interface Rect { x: number; y: number; w: number; h: number }
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;

export class OrbitScene {
  readonly clock = new SimulationClock();
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private real = false;
  private pluto = false;
  private selected: string | null = null;
  private zoom = 1;
  private pan: Point = { x: 0, y: 0 };
  private images = new Map<string, HTMLImageElement>();
  private hits: Hit[] = [];
  private pointers = new Map<number, Point>();
  private gesture: { start: Point; moved: boolean; multitouch: boolean } | null = null;
  private frame = 0;
  private destroyed = false;
  private lastReport = -Infinity;

  constructor(private canvas: HTMLCanvasElement, private callbacks: SceneCallbacks) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2Dを利用できません。対応ブラウザーで開いてください。');
    this.context = ctx;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('lostpointercapture', this.cancel);
    canvas.addEventListener('keydown', this.key);
    document.addEventListener('visibilitychange', this.visibility);
    this.clock.hidden = document.hidden;
    this.resize();
    void this.loadAssets();
    this.frame = requestAnimationFrame(this.animate);
  }

  async loadAssets() {
    this.callbacks.onAssets(true, []);
    const failures: string[] = [];
    await Promise.all([...planets.map(p => p.id), 'sun'].map(id => new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => { if (!this.destroyed) this.images.set(id, img); resolve(); };
      img.onerror = () => { failures.push(id); resolve(); };
      img.src = texturePath(id);
    })));
    if (!this.destroyed) this.callbacks.onAssets(false, failures);
  }

  configure(real: boolean, pluto: boolean, selected: string | null) {
    const changed = this.real !== real || this.pluto !== pluto;
    this.real = real; this.pluto = pluto; this.selected = selected;
    if (changed) this.fit();
  }
  setRunning(running: boolean) {
    this.clock.setRunning(running, performance.now());
    this.callbacks.onTime(this.clock.years);
  }
  setSpeed(speed: number) { this.clock.setSpeed(speed, performance.now()); }
  reset() {
    this.clock.reset(performance.now());
    this.selected = null;
    this.callbacks.onSelect(null);
    this.callbacks.onTime(0);
    this.fit();
  }
  fit() { this.zoom = 1; this.pan = { x: 0, y: 0 }; this.callbacks.onView(1); }
  zoomBy(factor: number) { this.zoomAt(factor, { x: this.width / 2, y: this.height / 2 }); }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
  }
  private origin() {
    const fit = fitView(this.width, this.height, this.real, this.pluto);
    return { scale: fit.scale * this.zoom, x: fit.center.x + this.pan.x, y: fit.center.y + this.pan.y };
  }
  private zoomAt(factor: number, anchor: Point) {
    const newZoom = clamp(this.zoom * factor, 0.5, 100);
    const ratio = newZoom / this.zoom;
    const o = this.origin();
    this.pan.x = anchor.x - (anchor.x - o.x) * ratio - (o.x - this.pan.x);
    this.pan.y = anchor.y - (anchor.y - o.y) * ratio - (o.y - this.pan.y);
    this.zoom = newZoom;
    this.callbacks.onView(this.zoom);
  }
  private local(event: PointerEvent | WheelEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.zoomAt(Math.exp(-clamp(event.deltaY, -200, 200) * 0.003), this.local(event));
  };
  private down = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const p = this.local(event);
    this.pointers.set(event.pointerId, p);
    this.canvas.setPointerCapture(event.pointerId);
    if (this.pointers.size === 1) this.gesture = { start: p, moved: false, multitouch: false };
    if (this.pointers.size > 1 && this.gesture) this.gesture.multitouch = true;
    this.canvas.style.cursor = 'grabbing';
  };
  private move = (event: PointerEvent) => {
    const next = this.local(event);
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      this.canvas.style.cursor = this.pick(next) ? 'pointer' : 'grab';
      return;
    }
    const old = [...this.pointers.values()];
    this.pointers.set(event.pointerId, next);
    if (this.gesture && Math.hypot(next.x - this.gesture.start.x, next.y - this.gesture.start.y) > 5) this.gesture.moved = true;
    if (this.pointers.size === 1) {
      this.pan.x += next.x - previous.x;
      this.pan.y += next.y - previous.y;
    } else if (this.pointers.size === 2) {
      const current = [...this.pointers.values()];
      const oldCenter = { x: (old[0].x + old[1].x) / 2, y: (old[0].y + old[1].y) / 2 };
      const center = { x: (current[0].x + current[1].x) / 2, y: (current[0].y + current[1].y) / 2 };
      const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
      const oldDistance = distance(old[0], old[1]);
      if (oldDistance > 0) this.zoomAt(distance(current[0], current[1]) / oldDistance, oldCenter);
      this.pan.x += center.x - oldCenter.x;
      this.pan.y += center.y - oldCenter.y;
    }
  };
  private up = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    const p = this.local(event);
    if (this.gesture && Math.hypot(p.x - this.gesture.start.x, p.y - this.gesture.start.y) > 5) this.gesture.moved = true;
    if (this.pointers.size === 1 && this.gesture && !this.gesture.moved && !this.gesture.multitouch) {
      const id = this.pick(p);
      this.selected = id;
      this.callbacks.onSelect(id);
    }
    this.pointers.delete(event.pointerId);
    if (!this.pointers.size) { this.gesture = null; this.canvas.style.cursor = 'grab'; }
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  };
  private cancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.gesture) this.gesture.multitouch = true;
    if (!this.pointers.size) { this.gesture = null; this.canvas.style.cursor = 'grab'; }
  };
  private key = (event: KeyboardEvent) => {
    const moves: Record<string, Point> = { ArrowLeft: { x: 30, y: 0 }, ArrowRight: { x: -30, y: 0 }, ArrowUp: { x: 0, y: 30 }, ArrowDown: { x: 0, y: -30 } };
    if (moves[event.key]) { event.preventDefault(); this.pan.x += moves[event.key].x; this.pan.y += moves[event.key].y; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); this.zoomBy(1.25); }
    if (event.key === '-') { event.preventDefault(); this.zoomBy(0.8); }
    if (event.key === 'Home') { event.preventDefault(); this.fit(); }
    if (event.key === 'Escape') { this.selected = null; this.callbacks.onSelect(null); }
  };
  private visibility = () => { this.clock.setHidden(document.hidden, performance.now()); };
  private pick(point: Point): string | null {
    const labels = this.hits.filter(h => h.label && point.x >= h.label.x && point.x <= h.label.x + h.label.w && point.y >= h.label.y && point.y <= h.label.y + h.label.h);
    const candidates = labels.length ? labels : this.hits.filter(h => Math.hypot(h.x - point.x, h.y - point.y) <= Math.max(18, h.radius));
    candidates.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
    return candidates[0]?.id ?? null;
  }

  private animate = (now: number) => {
    if (this.destroyed) return;
    const years = this.clock.tick(now);
    if (!document.hidden) {
      this.draw(years);
      if (now - this.lastReport >= 80) { this.callbacks.onTime(years); this.lastReport = now; }
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private ring(x: number, y: number, radius: number, kind: 'saturn' | 'uranus', front: boolean) {
    const ctx = this.context;
    ctx.save(); ctx.translate(x, y); ctx.rotate(kind === 'saturn' ? -0.35 : 1.15);
    const start = front ? 0 : Math.PI;
    for (let i = 0; i < 15; i++) {
      const r = radius * (1.35 + i * 0.043);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.36, 0, start, start + Math.PI);
      ctx.strokeStyle = kind === 'saturn' ? `rgba(213,196,153,${i === 8 ? 0.12 : 0.45 + (i % 3) * 0.15})` : `rgba(157,213,213,${i % 3 === 0 ? 0.8 : 0.24})`;
      ctx.lineWidth = Math.max(0.2, radius * 0.046); ctx.stroke();
    }
    ctx.restore();
  }

  private sprite(id: string, x: number, y: number, r: number, color: string) {
    const ctx = this.context;
    const img = this.images.get(id);
    if (img) { ctx.drawImage(img, x - r, y - r, r * 2, r * 2); return; }
    const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, Math.max(0.001, r));
    gradient.addColorStop(0, color); gradient.addColorStop(1, '#15191d');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  private draw(years: number) {
    const ctx = this.context;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, this.width, this.height);
    const visible = planets.filter(p => this.pluto || p.id !== 'pluto');
    const o = this.origin();
    const bodies = visible.map(p => {
      const point = position(p, years, this.real);
      return { p, x: o.x + point.x * o.scale, y: o.y - point.y * o.scale, radius: p.size / 2 };
    });
    const scales = bodyScales([...bodies, { x: o.x, y: o.y, radius: 18 }]);

    // Constant one-CSS-pixel tracks, independent of device pixel ratio and zoom.
    ctx.lineWidth = 1;
    for (const p of visible) {
      const track = projectedOrbit(orbitOf(p, this.real));
      ctx.strokeStyle = p.color + '65';
      ctx.beginPath();
      ctx.ellipse(o.x + track.center.x * o.scale, o.y - track.center.y * o.scale, track.radiusX * o.scale, track.radiusY * o.scale, -track.rotation, 0, TAU);
      ctx.stroke();
    }

    const sunRadius = 18 * scales[scales.length - 1];
    const glow = ctx.createRadialGradient(o.x, o.y, sunRadius * 0.3, o.x, o.y, Math.max(1, sunRadius * 3.6));
    glow.addColorStop(0, '#ffb83f55'); glow.addColorStop(0.35, '#ff9d2422'); glow.addColorStop(1, '#ff9d2400');
    ctx.fillStyle = glow; ctx.fillRect(o.x - sunRadius * 4, o.y - sunRadius * 4, sunRadius * 8, sunRadius * 8);
    this.sprite('sun', o.x, o.y, sunRadius, '#ffbe56');
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a968'; ctx.fillText('太陽', o.x, o.y - sunRadius - 15);

    this.hits = [];
    const labelRects: Rect[] = [{ x: o.x - 17, y: o.y - sunRadius - 23, w: 34, h: 18 }];
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i], r = b.radius * scales[i];
      if (b.x < -60 || b.x > this.width + 60 || b.y < -80 || b.y > this.height + 80) continue;
      if (b.p.ring) this.ring(b.x, b.y, r, b.p.ring, false);
      this.sprite(b.p.id, b.x, b.y, r, b.p.color);
      if (b.p.ring) this.ring(b.x, b.y, r, b.p.ring, true);
      if (this.selected === b.p.id) {
        ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(8, r + 5), 0, TAU);
        ctx.strokeStyle = '#9fe7c6'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      const label = this.label(b.p, b.x, b.y, r, labelRects);
      this.hits.push({ id: b.p.id, x: b.x, y: b.y, radius: r, label });
    }
  }

  private label(p: Planet, x: number, y: number, r: number, occupied: Rect[]) {
    const ctx = this.context;
    ctx.font = '11px system-ui, sans-serif';
    const w = ctx.measureText(p.name).width + 12;
    let rect: Rect = { x: clamp(x - w / 2, 4, this.width - w - 4), y: y - r - 25, w, h: 20 };
    for (let i = 0; i < 24 && occupied.some(o => overlaps(o, rect)); i++) rect = { ...rect, y: rect.y - 23 };
    if (rect.y < 7) {
      rect.y = y + r + 8;
      for (let i = 0; i < 24 && occupied.some(o => overlaps(o, rect)); i++) rect.y += 23;
    }
    occupied.push(rect);
    const shifted = Math.abs(rect.y - (y - r - 25)) > 3 || Math.abs(rect.x + w / 2 - x) > 3;
    if (shifted) {
      ctx.beginPath(); ctx.moveTo(x, y - r - 2); ctx.lineTo(rect.x + w / 2, rect.y + rect.h / 2);
      ctx.strokeStyle = p.color + '60'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    ctx.fillStyle = '#000000c9'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = this.selected === p.id ? '#b5f5d8' : '#c2cbd1';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.name, rect.x + rect.w / 2, rect.y + rect.h / 2);
    return rect;
  }

  destroy() {
    this.destroyed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    this.canvas.removeEventListener('wheel', this.wheel);
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.cancel);
    this.canvas.removeEventListener('lostpointercapture', this.cancel);
    this.canvas.removeEventListener('keydown', this.key);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
