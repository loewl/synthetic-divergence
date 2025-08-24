import { rand, clamp, lerp } from '../utils/math.js';

export class Genes {
  constructor({ hue, bodySize, metabolism, lifespan, prefTol, traits } = {}) {
    // Visual + physical
    this.hue = (hue ?? rand(360)) % 360;
    this.bodySize = bodySize ?? rand(22, 14);
    this.metabolism = metabolism ?? rand(0.9, 0.5);
    this.lifespan = lifespan ?? rand(220, 140);
    this.prefTol = prefTol ?? rand(60, 20);
    
    // Big Five (0..1)
    const t = traits || {};
    this.O = clamp(t.O ?? rand(1, 0), 0, 1); // Openness
    this.C = clamp(t.C ?? rand(1, 0), 0, 1); // Conscientiousness
    this.E = clamp(t.E ?? rand(1, 0), 0, 1); // Extraversion
    this.A = clamp(t.A ?? rand(1, 0), 0, 1); // Agreeableness
    this.N = clamp(t.N ?? rand(1, 0), 0, 1); // Neuroticism
  }

  static crossover(a, b, mutationRate) {
    const mix = (av, bv) => lerp(av, bv, Math.random());
    const mut = v => clamp(v + (Math.random() < mutationRate ? rand(0.2, -0.2) : 0), 0, 1);
    
    const g = new Genes({
      hue: (Math.random() < .5 ? a.hue : b.hue) + (Math.random() < mutationRate ? rand(40, -40) : 0),
      bodySize: clamp(mix(a.bodySize, b.bodySize) * (Math.random() < mutationRate ? rand(1.2, 0.85) : 1), 10, 30),
      metabolism: clamp(mix(a.metabolism, b.metabolism) * (Math.random() < mutationRate ? rand(1.2, 0.8) : 1), 0.35, 1.3),
      lifespan: clamp(mix(a.lifespan, b.lifespan) * (Math.random() < mutationRate ? rand(1.2, 0.8) : 1), 60, 360),
      prefTol: clamp(mix(a.prefTol, b.prefTol) + (Math.random() < mutationRate ? rand(20, -20) : 0), 5, 120),
      traits: {
        O: mut(mix(a.O, b.O)),
        C: mut(mix(a.C, b.C)),
        E: mut(mix(a.E, b.E)),
        A: mut(mix(a.A, b.A)),
        N: mut(mix(a.N, b.N))
      }
    });
    
    g.hue = (g.hue % 360 + 360) % 360;
    return g;
  }
}
