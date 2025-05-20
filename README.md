# EVAteer

A 2D space combat game inspired by EVE Online, built with HTML5 Canvas and JavaScript.

## Features

- Tactical map view centered on player's ship
- Ship module activation UI
- Target tracking and display
- Orbiting mechanics

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
