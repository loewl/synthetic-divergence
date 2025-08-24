import { Genes } from './Genes.js';
import { STATES } from '../core/constants.js';
import { TAU, clamp, lerp, rand, dist2, hueDiff } from '../utils/math.js';

export class Swimbot {
  constructor(x, y, genes, sim, asChild = false, parentA = null, parentB = null) {
    this.sim = sim;
    this.x = x;
    this.y = y;
    this.dir = rand(TAU);
    this.genes = genes || new Genes();
    
    // Generation and lineage tracking
    this.parentA = parentA;
    this.parentB = parentB;
    this.generation = parentA && parentB ? Math.max(parentA.generation || 0, parentB.generation || 0) + 1 : 0;
    
    this.age = 0;
    this.adultAge = 6 + this.genes.bodySize * 0.10;
    this.maxAge = this.genes.lifespan;
    this.energyMax = 70 + this.genes.bodySize * 4;
    this.energy = this.energyMax * (asChild ? 0.55 : 0.7);
    
    this.state = STATES.SEEK_FOOD;
    this.stateTimer = 0;
    this.mateCooldown = 0;
    this.target = null;
    this.partner = null;
    this.id = Math.random().toString(36).slice(2, 8);
    this.wobbleSeed = rand(1000);
    
    // Generate a cute name for the bot
    this.name = this.generateName();
    
    // Track if this bot was just born (for events)
    this.justBorn = asChild;
    
    // Motion params - influenced by fin characteristics
    this.vx = 0;
    this.vy = 0;
    
    // Base speed influenced by Extraversion (display fins) and Openness (exploration fins)
    const finSpeedBonus = (this.genes.E * 0.3) + (this.genes.O * 0.2);
    this.baseSpeed = (28 + this.genes.bodySize * 1.6) * (0.8 + 0.5 * this.genes.E) * (1 + finSpeedBonus);
    
    // Turn rate influenced by Conscientiousness (stability fins) and Neuroticism (nervous fins)
    const finStabilityBonus = this.genes.C * 0.4 - this.genes.N * 0.2;
    this.maxTurnRate = (1.6 - 0.7 * this.genes.C) + 0.8 * this.genes.N - finStabilityBonus;
    
    // Drag influenced by fin efficiency (Agreeableness for cooperative swimming)
    const finEfficiency = this.genes.A * 0.1;
    this.drag = 0.9 + finEfficiency;
    
    // Wander behavior
    this.wanderPhase = rand(TAU);
    this.wanderFreq = lerp(0.5, 1.4, this.genes.O);
    this.wanderAmp = lerp(0.05, 0.35, this.genes.O) + lerp(0.0, 0.15, this.genes.N) - this.genes.C * 0.08;
  }

  get isAdult() {
    return this.age >= this.adultAge;
  }

  get size() {
    const t = this.isAdult ? 1 : clamp(this.age / this.adultAge, 0.35, 1);
    return this.genes.bodySize * t;
  }

  hue() {
    return this.genes.hue;
  }

  moveStep(dt, desiredDir, desiredSpeed) {
    // Smooth heading toward desiredDir
    let d = desiredDir - this.dir;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const steer = clamp(d, -this.maxTurnRate * dt, this.maxTurnRate * dt);
    this.dir += steer;
    
    // Velocity toward heading with inertia
    const ax = Math.cos(this.dir) * desiredSpeed - this.vx;
    const ay = Math.sin(this.dir) * desiredSpeed - this.vy;
    this.vx += ax * (1 - Math.exp(-dt * 3));
    this.vy += ay * (1 - Math.exp(-dt * 3));
    
    // Drag and integrate
    this.vx *= (1 - clamp(this.drag * dt * 0.2, 0, 0.2));
    this.vy *= (1 - clamp(this.drag * dt * 0.2, 0, 0.2));
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Energy cost
    const spd = Math.hypot(this.vx, this.vy);
    this.energy -= dt * (0.10 + 0.0009 * spd) * (0.7 + 0.6 * this.genes.metabolism);
  }

  step(dt, w, h) {
    this.age += dt;
    this.stateTimer += dt;
    this.mateCooldown = Math.max(0, this.mateCooldown - dt);
    
    if (this.age > this.maxAge || this.energy <= 0) {
      if (this.sim && this.sim.removeBot) this.sim.removeBot(this);
      return;
    }

    // Trait-derived behavior parameters
    const satiety = this.energyMax * (0.55 + 0.3 * this.genes.C - 0.15 * this.genes.N);
    const greedProb = 0.15 + 0.5 * this.genes.N - 0.2 * this.genes.C;
    const mateUrgency = 0.3 + 0.7 * this.genes.E;
    const exploreBias = 0.2 + 0.8 * this.genes.O;
    const contestYield = 0.3 + 0.6 * this.genes.A - 0.2 * this.genes.E;
    const searchFoodR = 240 + 200 * this.genes.O;

    // Default wander behavior
    this.wanderPhase += TAU * this.wanderFreq * dt;
    const wanderDir = this.dir + Math.sin(this.wanderPhase) * this.wanderAmp;
    let desiredDir = wanderDir;
    let desiredSpeed = this.baseSpeed * (0.35 + 0.2 * this.genes.E);

    // State machine
    const result = this.updateStateMachine(dt, satiety, greedProb, searchFoodR, contestYield, wanderDir);
    if (result) {
      desiredDir = result.desiredDir;
      desiredSpeed = result.desiredSpeed;
    }
    
    // Apply movement
    this.moveStep(dt, desiredDir, desiredSpeed);
    this.handleBounds(w, h);
  }

  updateStateMachine(dt, satiety, greedProb, searchFoodR, contestYield, wanderDir) {
    let desiredDir = wanderDir;
    let desiredSpeed = this.baseSpeed * (0.35 + 0.2 * this.genes.E);

    switch (this.state) {
      case STATES.SEEK_FOOD: {
        if (this.isAdult && this.energy > Math.max(satiety, this.energyMax * 0.75)) {
          this.state = STATES.SEEK_MATE;
          this.stateTimer = 0;
          break;
        }
        if (!this.target) this.target = this.sim.findNearestFood(this.x, this.y, searchFoodR);
        if (this.target) this.state = STATES.CHASE_FOOD;
        desiredSpeed = this.baseSpeed * (0.55 + 0.25 * this.genes.E);
      } break;

      case STATES.CHASE_FOOD: {
        if (!this.target) {
          this.state = STATES.SEEK_FOOD;
          break;
        }
        const tx = this.target.x, ty = this.target.y;
        const ang = Math.atan2(ty - this.y, tx - this.x);
        desiredDir = ang;
        const d2 = dist2(this.x, this.y, tx, ty);
        const d = Math.sqrt(d2);
        const slow = d < 60 ? 0.7 : 1;
        const slow2 = d < 28 ? 0.5 : 1;
        desiredSpeed = this.baseSpeed * (0.85 + 0.25 * this.genes.E) * slow * slow2;
        
        // Check for contenders
        const contenders = this.sim.botGrid.queryRadius(tx, ty, 48);
        for (let i = 0; i < contenders.length; i++) {
          const o = contenders[i];
          if (o === this) continue;
          if (o.state !== STATES.CHASE_FOOD) continue;
          if (o.target !== this.target) continue;
          const oD2 = dist2(o.x, o.y, tx, ty);
          if (oD2 < d2 * 0.85) {
            if (Math.random() < contestYield) {
              this.target = null;
              this.state = STATES.SEEK_FOOD;
              desiredDir = wanderDir;
              break;
            }
          }
        }
        
        const eatR = 18;
        if (d2 < eatR * eatR) {
          this.energy = Math.min(this.energyMax, this.energy + this.target.energy);
          this.sim.removeFood(this.target);
          this.target = null;
          this.state = STATES.JUST_ATE;
          this.stateTimer = 0;
        }
      } break;

      case STATES.JUST_ATE: {
        desiredSpeed = this.baseSpeed * 0.35;
        if (this.energy < satiety || Math.random() < greedProb) {
          this.state = STATES.SEEK_FOOD;
        } else if (this.isAdult && this.stateTimer > 1.5 * (1.2 - this.genes.E)) {
          this.state = STATES.SEEK_MATE;
          this.stateTimer = 0;
        }
      } break;

      case STATES.SEEK_MATE: {
        if (!this.isAdult || this.mateCooldown > 0 || this.energy < this.energyMax * 0.70) {
          this.state = STATES.SEEK_FOOD;
          break;
        }
        if (!this.partner) this.partner = this.sim.findMate(this);
        if (this.partner) this.state = STATES.CHASE_MATE;
        else {
          desiredSpeed = this.baseSpeed * (0.55 + 0.25 * this.genes.E);
          const exploreBias = 0.2 + 0.8 * this.genes.O;
          desiredDir = wanderDir + (Math.random() - 0.5) * exploreBias;
        }
      } break;

      case STATES.CHASE_MATE: {
        if (!this.partner || !this.partner.isAdult) {
          this.state = STATES.SEEK_MATE;
          break;
        }
        const angle = Math.atan2(this.partner.y - this.y, this.partner.x - this.x);
        desiredDir = angle;
        desiredSpeed = this.baseSpeed * (0.9 + 0.3 * this.genes.E);
        if (dist2(this.x, this.y, this.partner.x, this.partner.y) < 36 * 36) {
          const ok = hueDiff(this.hue(), this.partner.hue()) <= Math.min(this.genes.prefTol, this.partner.genes.prefTol);
          if (ok && this.partner.mateCooldown <= 0) {
            this.state = STATES.MATING;
            this.stateTimer = 0;
            this.partner.state = STATES.MATING;
            this.partner.stateTimer = 0;
            this.partner.partner = this;
          } else {
            this.state = STATES.SEEK_MATE;
            this.partner = null;
          }
        }
      } break;

      case STATES.MATING: {
        desiredSpeed = this.baseSpeed * 0.2;
        if (this.stateTimer > 1.2) {
          if (this.partner) {
            if (this.id < this.partner.id) {
              this.spawnChildWith(this.partner);
              this.partner.mateCooldown = 12;
              this.mateCooldown = 12;
              this.energy *= 0.6;
              this.partner.energy *= 0.6;
            }
            this.partner.state = STATES.SEEK_FOOD;
            this.partner.stateTimer = 0;
            this.partner.partner = null;
          }
          this.partner = null;
          this.state = STATES.SEEK_FOOD;
          this.stateTimer = 0;
        }
      } break;
    }

    return { desiredDir, desiredSpeed };
  }

  handleBounds(w, h) {
    const m = Math.max(this.size * 0.8, 8);
    if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx) * 0.6; }
    if (this.x > w - m) { this.x = w - m; this.vx = -Math.abs(this.vx) * 0.6; }
    if (this.y < m) { this.y = m; this.vy = Math.abs(this.vy) * 0.6; }
    if (this.y > h - m) { this.y = h - m; this.vy = -Math.abs(this.vy) * 0.6; }
    
    if ((this.x <= m || this.x >= w - m || this.y <= m || this.y >= h - m) && 
        (Math.abs(this.vx) + Math.abs(this.vy) > 0.01)) {
      this.dir = Math.atan2(this.vy, this.vx);
    }
  }

  spawnChildWith(partner) {
    if (!this.isAdult || !partner.isAdult) return;
    if (this.sim && this.sim.shouldAllowBirth && !this.sim.shouldAllowBirth()) return;
    if (this.energy < this.energyMax * 0.7 || partner.energy < partner.energyMax * 0.7) return;
    
    const g = Genes.crossover(this.genes, partner.genes, this.sim.mutationRate);
    const cx = (this.x + partner.x) / 2 + rand(12, -12);
    const cy = (this.y + partner.y) / 2 + rand(12, -12);
    const child = new Swimbot(cx, cy, g, this.sim, true, this, partner);
    this.sim.addBot(child);
  }

  draw(ctx) {
    const s = this.size;
    const hue = this.hue();
    const bodyW = s * 1.2, bodyH = s * 0.9;
    const t = performance.now() * 0.002 + this.wobbleSeed;
    const swimSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) / this.baseSpeed;
    
    // OCEAN trait influences on fin sizes
    const oFinSize = 0.8 + this.genes.O * 0.6; // Openness affects exploration fins (pectorals)
    const cFinSize = 0.7 + this.genes.C * 0.5; // Conscientiousness affects stability fins
    const eFinSize = 0.9 + this.genes.E * 0.8; // Extraversion affects display fins (larger tails)
    const aFinSize = 0.8 + this.genes.A * 0.4; // Agreeableness affects cooperative swimming fins
    const nFinSize = 0.6 + this.genes.N * 0.7; // Neuroticism affects nervous energy fins
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.dir);
    
    ctx.shadowColor = `hsla(${hue},90%,65%,.35)`;
    ctx.shadowBlur = 8; // Reduced shadow blur
    
    // Draw tail fins first (behind the body) - influenced by Extraversion
    const tailSwim = Math.sin(t * 8 + swimSpeed * 10) * (0.3 + swimSpeed * 0.4);
    const tailSize = s * 0.9 * eFinSize; // Extraverted bots have bigger display tails
    
    // Main tail - simplified but more visible
    ctx.save();
    ctx.translate(-bodyW * 0.9, 0);
    ctx.rotate(tailSwim * 0.5);
    
    // Simple triangular tail
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-tailSize * 1.2, -tailSize * 0.6);
    ctx.lineTo(-tailSize * 1.4, 0);
    ctx.lineTo(-tailSize * 1.2, tailSize * 0.6);
    ctx.closePath();
    
    ctx.fillStyle = `hsla(${hue},75%,55%,0.9)`;
    ctx.strokeStyle = `hsla(${hue},85%,65%,1.0)`;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Dorsal fin (top) - influenced by Conscientiousness
    ctx.save();
    ctx.translate(-bodyW * 0.2, -bodyH * 0.8);
    ctx.rotate(tailSwim * 0.3 * cFinSize);
    
    ctx.beginPath();
    const dorsalSize = s * 0.6 * cFinSize;
    ctx.ellipse(0, 0, dorsalSize, dorsalSize * 0.5, 0, 0, TAU);
    ctx.fillStyle = `hsla(${hue},80%,60%,0.9)`;
    ctx.strokeStyle = `hsla(${hue},90%,70%,1.0)`;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Anal fin (bottom) - influenced by Conscientiousness  
    ctx.save();
    ctx.translate(-bodyW * 0.2, bodyH * 0.8);
    ctx.rotate(-tailSwim * 0.3 * cFinSize);
    
    ctx.beginPath();
    const analSize = s * 0.5 * cFinSize;
    ctx.ellipse(0, 0, analSize, analSize * 0.5, 0, 0, TAU);
    ctx.fillStyle = `hsla(${hue},80%,60%,0.8)`;
    ctx.strokeStyle = `hsla(${hue},90%,70%,0.9)`;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Pectoral fins (side fins) - influenced by Openness
    const pectoralSwim = Math.sin(t * 6 + swimSpeed * 8) * (0.2 + swimSpeed * 0.3);
    const pectoralSize = s * 0.8 * oFinSize; // Made larger for visibility
    
    // Left pectoral fin
    ctx.save();
    ctx.translate(bodyW * 0.3, -bodyH * 0.5);
    ctx.rotate(pectoralSwim * 0.4 + this.genes.O * 0.3);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, pectoralSize, pectoralSize * 0.5, 0, 0, TAU);
    ctx.fillStyle = `hsla(${hue + 20},85%,65%,0.95)`; // Much more opaque
    ctx.strokeStyle = `hsla(${hue + 30},90%,75%,1.0)`;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Right pectoral fin
    ctx.save();
    ctx.translate(bodyW * 0.3, bodyH * 0.5);
    ctx.rotate(-pectoralSwim * 0.4 - this.genes.O * 0.3);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, pectoralSize, pectoralSize * 0.5, 0, 0, TAU);
    ctx.fillStyle = `hsla(${hue + 20},85%,65%,0.95)`; // Much more opaque
    ctx.strokeStyle = `hsla(${hue + 30},90%,75%,1.0)`;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Small pelvic fins for adults (influenced by Neuroticism)
    if (this.isAdult && nFinSize > 0.8) {
      const pelvicSize = s * 0.4 * nFinSize; // Made larger
      const pelvicSwim = Math.sin(t * 12 + swimSpeed * 15) * (0.1 + this.genes.N * 0.2);
      
      // Left pelvic
      ctx.save();
      ctx.translate(-bodyW * 0.1, -bodyH * 0.4);
      ctx.rotate(pelvicSwim);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, pelvicSize, pelvicSize * 0.4, 0, 0, TAU);
      ctx.fillStyle = `hsla(${hue},75%,55%,0.8)`; // More opaque
      ctx.strokeStyle = `hsla(${hue},85%,65%,0.9)`;
      ctx.lineWidth = 0.6;
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
      
      // Right pelvic
      ctx.save();
      ctx.translate(-bodyW * 0.1, bodyH * 0.4);
      ctx.rotate(-pelvicSwim);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, pelvicSize, pelvicSize * 0.4, 0, 0, TAU);
      ctx.fillStyle = `hsla(${hue},75%,55%,0.8)`; // More opaque
      ctx.strokeStyle = `hsla(${hue},85%,65%,0.9)`;
      ctx.lineWidth = 0.6;
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Reset shadow for body
    ctx.shadowBlur = 12;
    
    // Draw body shape
    ctx.beginPath();
    const points = 20;
    const rBase = Math.max(bodyW, bodyH);
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * TAU;
      const wob = Math.sin(a * 3 + t * 2) * 0.04 + Math.cos(a * 5 + t * 1.5) * 0.03;
      const rx = bodyW * (1 + 0.10 * wob);
      const ry = bodyH * (1 - 0.10 * wob);
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    const fillGrad = ctx.createRadialGradient(0, 0, bodyH * 0.2, 0, 0, rBase * 1.05);
    fillGrad.addColorStop(0, `hsla(${(hue + 20) % 360},80%,70%,0.9)`);
    fillGrad.addColorStop(1, `hsla(${hue},70%,40%,0.6)`);
    ctx.fillStyle = fillGrad;
    ctx.strokeStyle = `hsla(${hue},95%,85%,.8)`;
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw eye
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath();
    ctx.arc(bodyW * 0.45, -bodyH * 0.2, 3.2, 0, TAU);
    ctx.fill();
    
    // Draw pupil with slight animation
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    const pupilX = bodyW * 0.45 + Math.sin(t * 0.5) * 0.5;
    const pupilY = -bodyH * 0.2 + Math.cos(t * 0.3) * 0.3;
    ctx.arc(pupilX, pupilY, 1.5, 0, TAU);
    ctx.fill();
    
    ctx.restore();
  }

  generateName() {
    const prefixes = ['Aqua', 'Fin', 'Swim', 'Wave', 'Coral', 'Blue', 'Pearl', 'Tide', 'Ocean', 'Nano', 'Micro', 'Zen', 'Neo', 'Pixel', 'Cyber'];
    const suffixes = ['bot', 'fish', 'ling', 'ie', 'y', 'er', 'o', 'fin', 'tail', 'wave', 'bit', 'byte', 'chip', 'core', 'flux'];
    
    const prefix = prefixes[Math.floor(this.genes.O * prefixes.length)];
    const suffix = suffixes[Math.floor(this.genes.E * suffixes.length)];
    
    return prefix + suffix;
  }

  getStateLabel() {
    return this.state + (this.isAdult ? '' : ' (child)');
  }
}
