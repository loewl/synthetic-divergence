import { Simulation } from './core/Simulation.js';
import { Renderer } from './rendering/Renderer.js';
import { UIController } from './ui/UIController.js';
import { StatsPanel } from './ui/StatsPanel.js';

class SwimbotsApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.simulation = new Simulation();
    this.renderer = new Renderer(this.canvas);
    this.uiController = new UIController(this.simulation, this.renderer);
    this.statsPanel = new StatsPanel();
    
    // Connect simulation with renderer for world size
    this.simulation.setRenderer(this.renderer);
    this.simulation.getWorldSize = () => this.renderer.getWorldSize();
    
    this.lastTime = performance.now();
    this.initialize();
  }

  initialize() {
    this.simulation.reset();
    console.assert(this.simulation.bots.length > 0, '[Swimbots] no bots after reset');
    this.startGameLoop();
  }

  startGameLoop() {
    const frame = () => {
      const now = performance.now();
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      dt = Math.min(dt, 0.05); // Cap delta time
      
      const worldSize = this.renderer.getWorldSize();
      
      if (this.simulation.running) {
        this.simulation.step(dt, worldSize.w, worldSize.h, this.uiController.foodRate);
      }
      
      this.renderer.render(this.simulation);
      this.statsPanel.update(this.simulation);
      this.uiController.updateSelectedInfo();
      
      requestAnimationFrame(frame);
    };
    
    requestAnimationFrame(frame);
  }
}

// Initialize the application
new SwimbotsApp();
