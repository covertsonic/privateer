# Privateer - Technical Documentation

## Project Overview

Privateer is a 2D space combat game inspired by classics like EVE Online, featuring component-based architecture, naval-style physics, and tactical ship combat. The game renders ships and other entities on a 2D canvas and uses a physics system that simulates space vessels with characteristics similar to naval ships - including drag, maximum velocity limits, and gradual acceleration/deceleration.

## Project Objectives

1. **Naval-Style Physics**: Implement a physics model where ships slow down when not under propulsion and have maximum velocity limits, similar to naval vessels rather than realistic space physics.
2. **Component-Based Architecture**: Use an Entity-Component-System (ECS) pattern for modular code organization.
3. **Interactive Combat**: Create engaging ship-to-ship combat with targeting, weapons, and defensive systems.
4. **Responsive UI**: Design a clean, informative UI that scales properly across different screen sizes.
5. **EVE Online-Inspired Systems**: Implement ship systems inspired by EVE Online, including shields, armor, and modules.

## Development Environment

### Recommended Web Server Setup

The project uses **Browser-Sync** for development, providing live-reload capabilities. To start the development server:

```bash
# Install Browser-Sync globally (if not already installed)
npm install -g browser-sync

# Start the development server with auto-reload
browser-sync start --server --files "*.html, *.css, js/**/*.js" --port 3000
```

This will:
- Start a server at http://localhost:3000
- Watch HTML, CSS, and JS files for changes
- Automatically reload the browser when files are saved
- Provide a control UI at http://localhost:3001

## Project Architecture

### Coordinate Systems

The game uses two distinct coordinate systems:

1. **Game World Coordinates (Meters)**
   - Used for physics calculations and game logic
   - Measured in meters (m)
   - Origin (0,0) is at the center of the game world
   - Not directly tied to the screen

2. **Screen Coordinates (Pixels)**
   - Used for rendering on the canvas
   - Measured in pixels (px)
   - Origin (0,0) is at the top-left corner of the canvas
   - Varies based on screen/window size

The conversion between these two systems is handled by:
- `scaleFactor`: Controls how many pixels represent one meter (default: 0.01)
- `velocityGameplayFactor`: Scales velocity for gameplay purposes (default: 1.0)

For example, a ship moving at 300 m/s in game world coordinates would move 300 * 0.01 * 1.0 = 3 pixels per second on screen.

### Entity-Component-System (ECS)

The game uses a component-based architecture:

1. **Entities**: Objects in the game (ships, projectiles, etc.)
2. **Components**: Data that defines entity properties (position, velocity, health, etc.)
3. **Systems**: Logic that processes entities with specific components

Key systems include:
- `PhysicsSystem`: Handles movement, collisions, and other physics calculations
- `RenderSystem`: Draws entities on the canvas
- `TargetingSystem`: Manages target selection and displays target information

## Folder Structure

```
privateer/
├── index.html             # Main HTML file
├── styles.css             # Global CSS styles
├── LICENSE                # License information
├── README.md              # Project readme
├── TECHNICAL_DOCUMENTATION.md  # This file
├── js/                    # JavaScript source code
│   ├── game/              # Game-specific code
│   │   ├── ecs/           # Entity-Component-System framework
│   │   │   ├── Entity.js            # Base entity class
│   │   │   └── EntityManager.js     # Manages all entities
│   │   ├── entities/      # Game entities
│   │   │   ├── Ship.js              # Base ship class
│   │   │   ├── PlayerShip.js        # Player-controlled ship
│   │   │   ├── EnemyShip.js         # AI-controlled ships
│   │   │   └── Projectile.js        # Weapons fire
│   │   ├── input/         # Input handling
│   │   │   └── InputManager.js      # Manages keyboard/mouse input
│   │   ├── modules/       # Ship modules/equipment
│   │   │   ├── Weapon.js            # Weapon modules
│   │   │   ├── ShieldModule.js      # Shield modules
│   │   │   ├── ArmorModule.js       # Armor modules
│   │   │   └── PropulsionModule.js  # Engine modules
│   │   ├── systems/       # Game systems
│   │   │   ├── PhysicsSystem.js     # Handles physics & movement
│   │   │   ├── RenderSystem.js      # Renders entities to canvas
│   │   │   └── TargetingSystem.js   # Manages targeting
│   │   └── Game.js        # Main game class
│   └── utils/             # Utility functions
│       └── math.js        # Math utilities
└── assets/                # Game assets
    └── images/            # Image assets
```

## Key Components

### Game Class

The `Game` class is the central controller that:
- Initializes all systems and managers
- Maintains the game loop
- Spawns entities
- Handles resizing and other global events

### EntityManager

The `EntityManager` tracks all entities and their components:
- Provides methods to add, remove, and query entities
- Organizes entities by component for efficient system processing
- Ensures components are properly registered and accessible

### PhysicsSystem

The `PhysicsSystem` applies naval-style physics in a space setting:
- Updates entity positions based on velocity with drag (unlike real space physics)
- Applies velocity limits to simulate engine capabilities
- Implements gradual deceleration when propulsion is not active
- Enforces boundaries to keep ships in the playable area
- Converts between game world units (meters) and screen coordinates (pixels)

### Ship Classes

Ships are the main interactive entities:
- `Ship`: Base class with common properties
- `PlayerShip`: Controlled by the player, responds to input
- `EnemyShip`: AI-controlled with various behaviors

## Troubleshooting Common Issues

### UI Scaling Issues

If the UI doesn't scale properly on small screens:
- Check the responsive media queries in `styles.css`
- Ensure the game canvas resizes correctly with the window
- Verify the `resize()` method in `Game.js` is being called

### Entity Movement Problems

If entities don't move as expected:
- Check the `PhysicsSystem.js` for proper velocity calculations
- Verify that entities have both position and velocity components
- Confirm that the deltaTime is being calculated and applied correctly

### Enemy Ships Not Spawning

If enemy ships don't appear:
- Use the restart button to force re-creation of enemies
- Check the console for errors during enemy creation
- Verify that the `EntityManager` is properly registering all components

## Performance Considerations

- The game uses `requestAnimationFrame` for smooth animation
- Components are designed to be lightweight and focused
- Entity filtering is optimized to only process relevant entities in each system
- Consider using object pooling for frequently created/destroyed objects like projectiles

## Future Enhancements

Potential areas for future development:
- Minimap for spatial awareness
- Advanced AI behaviors for enemy ships
- Additional weapon types and effects
- Mission/objective system
- Multiplayer capabilities
