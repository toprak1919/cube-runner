# CUBE RUNNER: NEON DIMENSION

A modular 3D web game built with Three.js featuring an immersive futuristic world where players navigate through various zones to collect data cores and stabilize the dimension.

![Cube Runner Screenshot](https://i.imgur.com/simulated_screenshot.png)

## Project Overview

Cube Runner is a first-person 3D game that demonstrates modern JavaScript modular architecture while providing engaging gameplay in a visually striking environment. The game uses a component-based approach with ES6 modules to create a maintainable and extensible codebase.

## Key Features

- **Immersive 3D Environment**: Navigate through distinct zones with unique architectural styles
- **First-Person Controls**: Fluid movement with WASD controls and mouse look
- **Special Abilities**: Dash and scan mechanics add strategic gameplay elements
- **Physics System**: Gravity, jumping, collision detection, and momentum
- **Collectibles**: Find data cores throughout the world to progress
- **Powerups**: Enhance your abilities with various powerups
- **Visual Effects**: Particle systems, animations, and dynamic lighting
- **Game Loop**: Time-based animation and consistent physics updates
- **UI System**: Dynamic HUD elements that update based on game state

## Modular Architecture

The project uses ES6 modules to separate concerns and create a maintainable codebase:

```
modular_game/
├── css/
│   └── style.css       # All UI styling
├── js/
│   ├── main.js         # Entry point and game loop
│   ├── game-state.js   # Game state management
│   ├── player.js       # Player character and controls
│   ├── abilities.js    # Player special abilities
│   ├── interactions.js # Object interactions (collectibles, hazards)
│   ├── ui.js           # UI management and updates
│   └── world.js        # World generation and environment
└── index.html          # Main HTML file
```

### Module Responsibilities

- **main.js**: Coordinates the game, runs the animation loop, and handles the overall game flow
- **game-state.js**: Manages game variables (score, energy, collectibles), game state transitions
- **player.js**: Handles player creation, physics, and input controls
- **abilities.js**: Implements special player abilities (dash, scan)
- **interactions.js**: Manages interactions with game objects (collecting items, taking damage)
- **ui.js**: Updates UI elements based on game state
- **world.js**: Generates the 3D environment, structures, and objects

## Getting Started

### Prerequisites

- A modern web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- A local web server to serve the files (required for ES6 modules)

### Running the Game

1. Clone or download the repository
2. Start a local web server in the project directory
   - Using Python: `python -m http.server`
   - Using VS Code: Install "Live Server" extension and click "Go Live"
   - Using Node.js: Install `http-server` package and run `http-server`
3. Open `http://localhost:8000` (or your server's URL) in your browser
4. Click "START GAME" to begin

## Controls

- **W/A/S/D**: Move forward/left/backward/right
- **Mouse**: Look around
- **Space**: Jump
- **Shift**: Dash (uses energy)
- **E**: Scan for collectibles (uses energy)
- **ESC**: Release mouse cursor

## Gameplay

1. **Objective**: Collect all data cores scattered throughout the world before time runs out
2. **Energy Management**: Dashing and scanning use energy, which regenerates slowly
3. **Exploration**: Different zones contain unique challenges and collectibles
4. **Movement**: Master the dash ability to reach difficult areas quickly
5. **Strategy**: Use the scan ability to locate remaining cores when needed

## World Zones

The game features several distinct zones, each with unique architecture and challenges:

1. **Central Hub**: Starting area with a holographic projector
2. **Data Towers**: Tall structures with data cores at various heights
3. **Science Lab**: Research facility with dome and equipment
4. **Power Core**: Energy generation area with a pulsing core
5. **Obstacle Zone**: Challenging area with moving platforms

## Technical Implementation Details

### Rendering

- Uses Three.js for 3D rendering and WebGL
- Dynamic lighting with ambient, directional, and point lights
- Custom materials with emissive properties for the futuristic look
- Particle systems for special effects

### Physics

- Custom physics implementation for player movement
- Collision detection using Three.js bounding boxes
- Time-based movement for consistent experience across different frame rates

### Animation System

- Animation loop with delta time for smooth movement
- Object-based animation system that allows for adding/removing animations dynamically
- Visual effects for abilities and interactions

### User Interface

- Dynamic HUD elements that update based on game state
- Message system for game events
- Energy and collectible tracking
- Timer countdown

## Extending the Game

The modular architecture makes it easy to extend the game:

- **Add New Zones**: Extend the `world.js` file with new zone creation functions
- **Add New Abilities**: Create new functions in `abilities.js` and hook them into the input system
- **Add New Collectibles**: Extend the collectible system in `interactions.js`
- **Enhance Graphics**: Modify materials and lighting in `world.js`

## Credits

This project demonstrates modern JavaScript game development techniques using:

- Three.js for 3D rendering
- ES6 modules for code organization
- Modern browser APIs

## License

This project is available for educational purposes.
