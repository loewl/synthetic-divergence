import { rand } from '../utils/math.js';
import { TAU } from '../utils/math.js';

export class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = rand(2.5, 1.2);
    this.energy = rand(24, 12);
    this.vx = rand(-.2, .2);
    this.vy = rand(-.2, .2);
  }

  step(w, h) {
    this.x += this.vx;
    this.y += this.vy;
    const r = this.r;
    
    if (this.x < r) { this.x = r; this.vx = Math.abs(this.vx); }
    if (this.x > w - r) { this.x = w - r; this.vx = -Math.abs(this.vx); }
    if (this.y < r) { this.y = r; this.vy = Math.abs(this.vy); }
    if (this.y > h - r) { this.y = h - r; this.vy = -Math.abs(this.vy); }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fillStyle = 'rgba(160,220,255,0.95)';
    ctx.fill();
  }
}
