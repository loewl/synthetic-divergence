import { Food } from '../entities/Food.js';
import { Swimbot } from '../entities/Swimbot.js';
import { Genes } from '../entities/Genes.js';
import { SpatialHashGrid } from './SpatialHashGrid.js';
import { STATES } from './constants.js';
import { dist2, hueDiff, rand, clamp } from '../utils/math.js';

export class Simulation {
  constructor() {
    this.bots = [];
    this.food = [];
    this.time = 0;
    this.running = true;
    this.spawnFoodBase = 1.2;
    this.mutationRate = 0.07;
    
    // Population control
    this.popTarget = 50;
    this.popHardCap = 90;
    this.selected = null;
    this.didReSeed = false;
    
    // Spatial grids
    this.foodGrid = new SpatialHashGrid(56);
    this.botGrid = new SpatialHashGrid(80);
  }

  reset() {
    this.bots.length = 0;
    this.food.length = 0;
    this.seedBots(32);
    this.selected = null;
  }

  seedBots(n) {
    const worldSize = this.getWorldSize();
    for (let i = 0; i < n; i++) {
      const g = new Genes();
      g.hue = rand(360);
      g.bodySize = rand(13, 8);
      this.addBot(new Swimbot(rand(worldSize.w), rand(worldSize.h), g, this));
    }
  }

  getWorldSize() {
    // Default world   size for server-side simulation
    return { w: 1920, h: 1080 };
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  addBot(b) {
    this.bots.push(b);
  }

  spawnRandomBot() {
    const worldSize = this.getWorldSize();
    const g = new Genes();
    g.hue = rand(360);
    g.bodySize = rand(13, 8);
    const bot = new Swimbot(rand(worldSize.w), rand(worldSize.h), g, this);
    this.addBot(bot);
    return bot;
  }

  removeBot(b) {
    const i = this.bots.indexOf(b);
    if (i >= 0) this.bots.splice(i, 1);
    if (this.selected === b) this.selected = null;
  }

  removeFood(f) {
    const i = this.food.indexOf(f);
    if (i >= 0) this.food.splice(i, 1);
  }

  findNearestFood(x, y, radius) {
    let best = null, bestD = radius * radius;
    const candidates = this.foodGrid.queryRadius(x, y, radius);
    for (let i = 0; i < candidates.length; i++) {
      const f = candidates[i];
      const d = dist2(x, y, f.x, f.y);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  findMate(self) {
    let best = null, bestD = 1e9;
    const R = 360;
    const candidates = this.botGrid.queryRadius(self.x, self.y, R);
    
    for (let i = 0; i < candidates.length; i++) {
      const b = candidates[i];
      if (b === self) continue;
      if (!b.isAdult) continue;
      if (b.mateCooldown > 0) continue;
      
      const hueClose = hueDiff(self.hue(), b.hue()) <= Math.min(self.genes.prefTol, b.genes.prefTol);
      if (!hueClose) continue;
      
      if (!(b.state === STATES.SEEK_MATE || b.state === STATES.JUST_ATE || b.state === STATES.SEEK_FOOD)) continue;
      
      const d = dist2(self.x, self.y, b.x, b.y);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  pickAt(x, y) {
    let best = null, bestD = 20 * 20;
    const R = 28;
    const candidates = this.botGrid.queryRadius(x, y, R);
    
    for (let i = 0; i < candidates.length; i++) {
      const b = candidates[i];
      const d = dist2(x, y, b.x, b.y);
      const r = Math.max(b.size * 1.2, 14);
      if (d < Math.min(bestD, r * r)) {
        best = b;
        bestD = d;
      }
    }
    
    this.selected = best;
    return best;
  }

  shouldAllowBirth() {
    const n = this.bots.length;
    if (n >= this.popHardCap) return false;
    if (n <= this.popTarget) return true;
    const p = (this.popHardCap - n) / (this.popHardCap - this.popTarget);
    return Math.random() < clamp(p, 0, 1);
  }

  step(dt, w, h, foodRate) {
    this.time += dt;
    
    if (!this.bots.length && !this.didReSeed) {
      this.seedBots(32);
      this.didReSeed = true;
    }
    
    // Spawn food
    const rate = this.spawnFoodBase * foodRate;
    if (Math.random() < rate * dt) {
      this.food.push(new Food(rand(w), rand(h)));
    }
    
    // Update food
    for (const f of this.food) {
      f.step(w, h);
    }
    
    // Rebuild spatial indices
    this.foodGrid.rebuildFrom(this.food, f => f.x, f => f.y);
    this.botGrid.rebuildFrom(this.bots, b => b.x, b => b.y);
    
    // Update bots
    for (const b of [...this.bots]) {
      b.step(dt, w, h);
    }
  }

  spawnRandomBot() {
    const worldSize = this.getWorldSize();
    const g = new Genes();
    g.hue = rand(360);
    g.bodySize = rand(13, 8);
    const bot = new Swimbot(rand(worldSize.w), rand(worldSize.h), g, this);
    this.addBot(bot);
    return bot;
  }

  createCustomGenes(oceanTraits) {
    const g = new Genes();
    
    // Set OCEAN traits from user input (0-1 range)
    g.O = clamp(oceanTraits.openness || 0.5, 0, 1);
    g.C = clamp(oceanTraits.conscientiousness || 0.5, 0, 1);
    g.E = clamp(oceanTraits.extraversion || 0.5, 0, 1);
    g.A = clamp(oceanTraits.agreeableness || 0.5, 0, 1);
    g.N = clamp(oceanTraits.neuroticism || 0.5, 0, 1);
    
    // Set visual traits
    g.hue = rand(360);
    g.bodySize = rand(13, 8);
    
    return g;
  }

  spawnBotWithGenes(genes) {
    const worldSize = this.getWorldSize();
    const bot = new Swimbot(rand(worldSize.w), rand(worldSize.h), genes, this);
    this.addBot(bot);
    return bot;
  }
}
