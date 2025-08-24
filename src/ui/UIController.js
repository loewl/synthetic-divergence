import { STATE_COLORS, TRAIT_COLORS } from '../core/constants.js';

export class UIController {
  constructor(simulation, renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.foodRate = 1;
    
    this.setupEventListeners();
    this.setupLegends();
    this.initializeControls();
  }

  setupEventListeners() {
    // Control buttons
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');
    
    btnPause.addEventListener('click', () => {
      this.simulation.running = !this.simulation.running;
      btnPause.textContent = this.simulation.running ? 'Pause' : 'Resume';
    });
    
    btnReset.addEventListener('click', () => {
      this.simulation.reset();
    });

    // Sliders
    document.getElementById('mutRate').addEventListener('input', e => {
      this.setMutationRate(parseFloat(e.target.value));
    });
    
    document.getElementById('foodRate').addEventListener('input', e => {
      this.setFoodRate(parseFloat(e.target.value));
    });

    // Canvas click
    this.renderer.canvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e);
    });
  }

  setupLegends() {
    // State legend
    const stateLegendEl = document.getElementById('stateLegend');
    for (const [k, c] of Object.entries(STATE_COLORS)) {
      const span = document.createElement('span');
      span.className = 'pill';
      span.innerHTML = `<span class="dot" style="background:${c}"></span>${k}`;
      stateLegendEl.appendChild(span);
    }

    // Trait legend
    const traitLegendEl = document.getElementById('traitLegend');
    for (const [k, c] of Object.entries(TRAIT_COLORS)) {
      const span = document.createElement('span');
      span.className = 'pill';
      span.innerHTML = `<span class="dot" style="background:${c}"></span>${k}`;
      traitLegendEl.appendChild(span);
    }
  }

  initializeControls() {
    this.setFoodRate(1);
    this.setMutationRate(0.07);
  }

  setMutationRate(value) {
    this.simulation.mutationRate = value;
    document.getElementById('mutRateLbl').textContent = value.toFixed(2);
  }

  setFoodRate(value) {
    this.foodRate = value;
    document.getElementById('foodRateLbl').textContent = value.toFixed(1);
  }

  handleCanvasClick(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const picked = this.simulation.pickAt(x, y);
    
    if (!picked) {
      document.getElementById('selInfo').textContent = 'No creature here. Click another.';
      document.getElementById('selEnergy').style.width = '0%';
      return;
    }
    
    this.updateSelectedInfo();
  }

  updateSelectedInfo() {
    const b = this.simulation.selected;
    const setBar = (id, val, color) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.width = Math.round(val * 100) + '%';
        el.style.background = color;
      }
    };

    if (!b) {
      document.getElementById('selInfo').textContent = 'Click a creature to inspect.';
      document.getElementById('selEnergy').style.width = '0%';
      ['barO', 'barC', 'barE', 'barA', 'barN'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = '0%';
      });
      return;
    }

    const pct = Math.max(0, Math.min(100, (b.energy / b.energyMax) * 100)).toFixed(1);
    document.getElementById('selInfo').innerHTML = `id ${b.id} | hue ${b.hue().toFixed(1)}°
state ${b.state}${b.isAdult ? '' : ' (child)'} | age ${b.age.toFixed(1)}s / ${b.maxAge.toFixed(1)}s
O ${b.genes.O.toFixed(2)} C ${b.genes.C.toFixed(2)} E ${b.genes.E.toFixed(2)} A ${b.genes.A.toFixed(2)} N ${b.genes.N.toFixed(2)}`;
    
    document.getElementById('selEnergy').style.width = pct + '%';
    setBar('barO', b.genes.O, TRAIT_COLORS.O);
    setBar('barC', b.genes.C, TRAIT_COLORS.C);
    setBar('barE', b.genes.E, TRAIT_COLORS.E);
    setBar('barA', b.genes.A, TRAIT_COLORS.A);
    setBar('barN', b.genes.N, TRAIT_COLORS.N);
  }
}
