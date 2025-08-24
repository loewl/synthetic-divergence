import { TAU } from '../utils/math.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.DPR = Math.min(2, window.devicePixelRatio || 1);
    
    this.setupCanvas();
    this.setupBubbles();
  }

  setupCanvas() {
    const resize = () => {
      this.canvas.width = Math.floor(this.canvas.clientWidth * this.DPR);
      this.canvas.height = Math.floor(this.canvas.clientHeight * this.DPR);
      this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    };
    
    new ResizeObserver(resize).observe(this.canvas);
    resize();
  }

  setupBubbles() {
    this.bubbles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.4,
      s: Math.random() * 0.15 + 0.05
    }));
  }

  getWorldSize() {
    const rect = this.canvas.getBoundingClientRect();
    return {
      w: Math.max(2, Math.floor(rect.width)),
      h: Math.max(2, Math.floor(rect.height))
    };
  }

  clear() {
    const { w, h } = this.getWorldSize();
    this.ctx.clearRect(0, 0, w, h);
  }

  drawTankBorder() {
    const { w, h } = this.getWorldSize();
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, w - 2, h - 2);
    this.ctx.restore();
  }

  drawBubbles() {
    const { w, h } = this.getWorldSize();
    this.ctx.save();
    this.ctx.globalAlpha = 0.4;
    
    for (const b of this.bubbles) {
      const x = (b.x * w + Math.sin((performance.now() * 0.0005 + b.x * 9)) * 8);
      const y = ((b.y * h - (performance.now() * 0.02 * b.s)) % h + h) % h;
      this.ctx.beginPath();
      this.ctx.arc(x, y, b.r, 0, TAU);
      this.ctx.fillStyle = 'rgba(255,255,255,.12)';
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  drawSelectionRing(bot) {
    if (!bot) return;
    
    const hue = bot.hue();
    this.ctx.save();
    this.ctx.translate(bot.x, bot.y);
    this.ctx.rotate(bot.dir);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = `hsl(${hue},100%,80%)`;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, bot.size * 1.2, bot.size * 0.9, 0, 0, TAU);
    this.ctx.stroke();
    this.ctx.restore();
  }

  render(simulation, options = {}) {
    this.clear();
    this.drawTankBorder();
    this.drawBubbles();
    
    // Draw food
    for (const food of simulation.food) {
      food.draw(this.ctx);
    }
    
    // Draw bots
    for (const bot of simulation.bots) {
      bot.draw(this.ctx);
    }
    
    // Draw bot names if UI is visible
    if (options.showNames) {
      this.drawBotNames(simulation.bots);
    }
    
    // Draw selection ring
    this.drawSelectionRing(simulation.selected);
  }

  drawBotNames(bots) {
    this.ctx.save();
    this.ctx.font = '11px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    for (const bot of bots) {
      // Only show names for bots that are reasonably visible (not too crowded)
      const nameY = bot.y - bot.size - 8;
      
      // Background for readability
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const textWidth = this.ctx.measureText(bot.name).width;
      this.ctx.fillRect(bot.x - textWidth/2 - 3, nameY - 12, textWidth + 6, 14);
      
      // Bot name with hue-based color
      this.ctx.fillStyle = `hsl(${bot.hue()}, 80%, 90%)`;
      this.ctx.fillText(bot.name, bot.x, nameY);
      
      // Show fin indicators for adults
      if (bot.isAdult && bot.generation > 0) {
        this.ctx.font = '9px Arial, sans-serif';
        
        // Create fin trait indicators
        const finIndicators = [];
        if (bot.genes.E > 0.7) finIndicators.push('🎯'); // Large tail (high E)
        if (bot.genes.O > 0.7) finIndicators.push('🔍'); // Large pectorals (high O)
        if (bot.genes.C > 0.7) finIndicators.push('⚖️'); // Stable fins (high C)
        if (bot.genes.N > 0.7) finIndicators.push('⚡'); // Nervous fins (high N)
        if (bot.genes.A > 0.7) finIndicators.push('🤝'); // Efficient fins (high A)
        
        if (finIndicators.length > 0) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          this.ctx.fillText(finIndicators.join(''), bot.x, nameY + 12);
        }
        
        // Generation info
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText(`Gen ${bot.generation}`, bot.x, nameY + 24);
        this.ctx.font = '11px Arial, sans-serif';
      }
    }
    
    this.ctx.restore();
  }
}
