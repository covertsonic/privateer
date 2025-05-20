# Privateer

A 2D space combat and trading game built with HTML5 Canvas and JavaScript.

## Current Status

✅ **Implemented**
- Core ECS (Entity-Component-System) architecture
- Basic player ship with movement and physics
- Input handling (keyboard + mouse)
- Basic UI with ship status
- Module system (weapons, shields, armor, propulsion)
- Basic enemy AI

🚧 **In Progress**
- Target locking system
- Orbiting mechanics
- Combat system

## Next Steps

### High Priority
1. **Targeting System**
   - Implement target locking mechanics
   - Add visual indicators for locked targets
   - Display target information in the UI

2. **Orbiting Mechanics**
   - Implement orbit logic for the player ship
   - Add orbit distance control
   - Visual feedback for orbit status

3. **Combat System**
   - Weapon firing mechanics
   - Projectile system
   - Damage calculation and application

### Medium Priority
- Module activation UI
- Enhanced enemy AI
- Sound effects and visual feedback
- Game state management

### Future Features
- Multiple weapon systems
- Ship customization
- Mission system
- Persistent universe
- Multiplayer support

## Features

- Tactical map view centered on player's ship
- Ship module activation UI
- Target tracking and display
- Orbiting mechanics
- Modular ship systems
- Physics-based movement
- Interactive UI with ship status

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/evateer2.git
   cd evateer2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:
```bash
npm run dev
```

Open your browser to `http://localhost:5173` to see the game in action.

## Project Structure

```
├── js/
│   └── game/               # Game source code
│       ├── ecs/            # Entity Component System
│       ├── entities/       # Game entities (ships, projectiles, etc.)
│       ├── input/         # Input handling
│       ├── modules/        # Ship modules and components
│       └── systems/        # Game systems (rendering, physics, etc.)
├── index.html            # Main HTML file
├── styles.css            # Main styles
└── package.json          # Project configuration and dependencies
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
