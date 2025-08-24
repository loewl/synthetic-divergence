import { STATES } from '../core/constants.js';

export class StatsPanel {
  constructor() {
    this.elements = {
      kTotal: document.getElementById('kTotal'),
      kAdults: document.getElementById('kAdults'),
      kChildren: document.getElementById('kChildren'),
      kFood: document.getElementById('kFood'),
      stateList: document.getElementById('stateList'),
      geneStats: document.getElementById('geneStats')
    };
  }

  update(simulation) {
    this.updatePopulationStats(simulation);
    this.updateStateStats(simulation);
    this.updateGeneStats(simulation);
  }

  updatePopulationStats(simulation) {
    const total = simulation.bots.length;
    const adults = simulation.bots.filter(b => b.isAdult).length;
    const children = total - adults;
    
    this.elements.kTotal.textContent = total;
    this.elements.kAdults.textContent = adults;
    this.elements.kChildren.textContent = children;
    this.elements.kFood.textContent = simulation.food.length;
  }

  updateStateStats(simulation) {
    const order = [
      STATES.SEEK_FOOD,
      STATES.CHASE_FOOD,
      STATES.JUST_ATE,
      STATES.SEEK_MATE,
      STATES.CHASE_MATE,
      STATES.MATING
    ];
    
    const counts = {};
    for (const st of order) {
      counts[st] = 0;
      counts[st + ' (child)'] = 0;
    }
    
    for (const b of simulation.bots) {
      counts[b.getStateLabel()] = (counts[b.getStateLabel()] || 0) + 1;
    }
    
    const lines = order.flatMap(st => [
      `• ${st.padEnd(16, ' ')} ${String(counts[st]).padStart(3, ' ')}`,
      `• ${(st + ' (child)').padEnd(16, ' ')} ${String(counts[st + ' (child)']).padStart(3, ' ')}`
    ]).join('\n');
    
    this.elements.stateList.textContent = lines || '—';
  }

  updateGeneStats(simulation) {
    const total = simulation.bots.length;
    
    if (total === 0) {
      this.elements.geneStats.textContent = '—';
      return;
    }
    
    const sums = simulation.bots.reduce((o, b) => {
      o.h += b.genes.hue;
      o.bs += b.genes.bodySize;
      o.met += b.genes.metabolism;
      o.life += b.genes.lifespan;
      o.tol += b.genes.prefTol;
      o.O += b.genes.O;
      o.C += b.genes.C;
      o.E += b.genes.E;
      o.A += b.genes.A;
      o.N += b.genes.N;
      return o;
    }, { h: 0, bs: 0, met: 0, life: 0, tol: 0, O: 0, C: 0, E: 0, A: 0, N: 0 });
    
    const avg = k => (sums[k] / total);
    
    this.elements.geneStats.textContent = 
      `hue ${avg('h').toFixed(1)}°, body ${avg('bs').toFixed(1)}, metab ${avg('met').toFixed(2)}, life ${avg('life').toFixed(1)}s, tol ${avg('tol').toFixed(1)}° | O ${avg('O').toFixed(2)} C ${avg('C').toFixed(2)} E ${avg('E').toFixed(2)} A ${avg('A').toFixed(2)} N ${avg('N').toFixed(2)}`;
  }
}
