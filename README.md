# Synthetic Divergence - Swimbots Evolution Sandbox

🐟 An interactive evolution simulation featuring AI-driven creatures with personality traits based on the Big Five (OCEAN) psychological model.

## Getting Started

Serve over local webserver, easiest: 
```bash
python -m http.server 8000
```
in the project dir, then open `http://localhost:8000`

Alternatively, use Node.js:
```bash
npx http-server -p 8000
```

## Project Structure

```
synthetic-divergence/
├── index.html                    # Main application entry
├── styles/
│   └── main.css                 # Application styling
└── src/
    ├── main.js                  # Application bootstrap
    ├── core/
    │   ├── constants.js         # Game constants and colors
    │   ├── SpatialHashGrid.js   # Spatial optimization system
    │   └── Simulation.js        # Main simulation engine
    ├── entities/
    │   ├── Food.js              # Food particle behavior
    │   ├── Genes.js             # Genetic system and inheritance
    │   └── Swimbot.js           # Creature AI and behavior
    ├── rendering/
    │   └── Renderer.js          # Canvas rendering system
    ├── ui/
    │   ├── UIController.js      # User interface controls
    │   └── StatsPanel.js        # Statistics and metrics display
    └── utils/
        └── math.js              # Mathematical utilities
```

## How It Works

Swimbots are autonomous agents that:
- **Seek food** to survive and gain energy
- **Find mates** with similar colors (hue-based attraction)
- **Reproduce** through genetic crossover with mutation
- **Evolve** personality traits over generations
- **Die** from old age or starvation

## OCEAN Personality Traits

Each swimbot has five personality traits (0.0-1.0) that affect behavior:

### 🔮 O - Openness to Experience
**Effects:** Exploration and curiosity
- **Wander Behavior**: Higher values = more varied, exploratory movement patterns
- **Search Radius**: Open bots search wider areas for food (240-440 pixel radius)
- **Movement Patterns**: More creative, less predictable swimming paths

### 🎯 C - Conscientiousness  
**Effects:** Self-discipline and organization
- **Movement Control**: Higher values = smoother, more controlled turning
- **Energy Management**: Conscientious bots wait until well-fed before seeking mates
- **Greed Resistance**: Less likely to compete aggressively for food
- **Maturation**: Affects when bots reach adulthood

### ⚡ E - Extraversion
**Effects:** Social energy and activity levels
- **Movement Speed**: Extraverted bots swim 30-80% faster than introverts
- **Mate Seeking**: More eager and persistent in finding partners
- **Competition**: Less likely to back down in resource conflicts
- **Activity**: Higher baseline energy and movement when wandering

### 🤝 A - Agreeableness
**Effects:** Cooperation and empathy
- **Conflict Resolution**: Agreeable bots yield in food competitions
- **Social Behavior**: More cooperative, less aggressive interactions
- **Resource Sharing**: More willing to give way to other bots

### 😰 N - Neuroticism
**Effects:** Emotional instability and anxiety
- **Movement Jitter**: Higher values = more erratic, anxious swimming
- **Food Anxiety**: Lower satisfaction thresholds, seek food more urgently
- **Greed**: More likely to compete desperately for resources
- **Stress Response**: Amplifies other behavioral traits under pressure

## Behavioral States

Bots cycle through different behavioral states:

- **🔍 Seek Food**: Random exploration looking for nutrition
- **🏃 Chase Food**: Actively pursuing a detected food source  
- **😋 Just Ate**: Brief satisfaction period after feeding
- **💕 Seek Mate**: Looking for compatible partners (similar hue)
- **💘 Chase Mate**: Pursuing a potential partner
- **💖 Mating**: Reproduction process with genetic crossover

## Genetic System

### Inheritance
- **Hue**: Visual appearance, determines mate compatibility
- **Body Size**: Affects speed, energy capacity, and maturation
- **Metabolism**: Energy consumption rate
- **Lifespan**: Maximum age before natural death
- **Preference Tolerance**: How similar a mate's hue must be
- **OCEAN Traits**: Personality characteristics

### Evolution
- **Crossover**: Offspring inherit mixed traits from both parents
- **Mutation**: Random changes to prevent genetic stagnation
- **Selection Pressure**: Only successful bots survive to reproduce
- **Population Control**: Soft caps prevent overcrowding

## Controls

- **Pause/Resume**: Stop/start the simulation
- **Reset**: Generate new random population
- **Food Rate**: Control food spawn frequency (0-3x)
- **Mutation Rate**: Adjust genetic variation (0-50%)
- **Click Bots**: Inspect individual creature stats and genetics

## Features

### Visual Effects
- **Hue-based Coloring**: Each bot's appearance reflects its genetics
- **State Indicators**: Color-coded behavioral states
- **Selection Highlighting**: Click bots to see detailed information
- **Aquatic Atmosphere**: Animated bubbles and lighting effects

### Analytics
- **Population Stats**: Track total bots, adults, children, and food
- **State Distribution**: See what behaviors are currently active
- **Genetic Averages**: Monitor trait evolution over time
- **Individual Inspection**: Detailed stats for selected creatures

### Performance
- **Spatial Hashing**: Efficient collision detection for large populations
- **Adaptive Population**: Dynamic birth rate based on current population
- **Optimized Rendering**: Smooth 60fps with hundreds of creatures

## Emergent Behaviors

The combination of traits creates realistic, complex behaviors:

- **Explorer Bots** (High O): Discover new food sources, wide-ranging
- **Steady Bots** (High C): Efficient, reliable, good survivors  
- **Social Bots** (High E): Fast-moving, active reproducers
- **Peaceful Bots** (High A): Avoid conflicts, cooperative
- **Anxious Bots** (High N): Erratic but competitive for resources

## Technical Details

- **Language**: Vanilla JavaScript ES6+ with modules
- **Rendering**: HTML5 Canvas with optimized drawing
- **Architecture**: Modular OOP design for easy extension
- **Performance**: Spatial partitioning for O(1) neighbor queries
- **Compatibility**: Modern browsers with ES6 module support

## Extending the Simulation

The modular architecture makes it easy to add:
- New behavioral states and transitions
- Additional genetic traits or physical characteristics  
- Environmental factors (temperature, currents, obstacles)
- Predator-prey relationships
- Different species with unique behaviors
- Data export and analysis tools

## Credits

Based on artificial life and evolutionary computation principles, implementing:
- Genetic algorithms for trait inheritance
- Finite state machines for behavior modeling
- Spatial partitioning for performance optimization
- Big Five personality psychology for realistic behavioral modeling