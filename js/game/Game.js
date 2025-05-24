console.log('=== GAME.JS MODULE LOADING ===');
console.log('Current time:', new Date().toISOString());

import { EntityManager } from './ecs/EntityManager.js';
import { InputManager } from './input/InputManager.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { TargetingSystem } from './systems/TargetingSystem.js';
import { AISystem } from './systems/AISystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { PlayerShip } from './entities/PlayerShip.js';
import { EnemyShip } from './entities/EnemyShip.js';
import { NavBuoy } from './entities/NavBuoy.js';
import { POISystem } from './systems/POISystem.js';

console.log('All imports completed');

// Debug: Check if required elements exist after imports
const checkDOM = () => {
    console.log('Checking required elements...');
    console.log('Canvas element:', document.getElementById('game-canvas'));
    console.log('Game container:', document.querySelector('.game-container') || document.getElementById('game-container'));
};

export class Game {
    constructor() {
        console.log('Game constructor called');
        
        // Get canvas and context
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element with id "game-canvas" not found');
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Get the game container
        // Support both class and id selectors for the game container
        this.gameContainer = document.querySelector('.game-container') || document.getElementById('game-container');
        if (!this.gameContainer) {
            throw new Error('Game container element not found');
        }
        
        // Initialize entity manager
        this.entityManager = new EntityManager();
        console.log('EntityManager initialized');
        
        // Initialize input manager
        this.inputManager = new InputManager();
        console.log('InputManager initialized');
        
        // Initialize systems
        this.renderSystem = new RenderSystem(this.ctx);
        console.log('RenderSystem initialized');
        
        this.physicsSystem = new PhysicsSystem();
        console.log('PhysicsSystem initialized');
        
        this.aiSystem = new AISystem();
        console.log('AISystem initialized');
        
        this.targetingSystem = new TargetingSystem(this);
        console.log('TargetingSystem initialized');
        
        // Combat system
        this.combatSystem = new CombatSystem();
        console.log('CombatSystem initialized');

        this.poiSystem = new POISystem(this);
        console.log('POISystem initialized');
        
        // Game state
        this.player = null;
        this.enemies = [];
        this.target = null;
        
        // Set canvas size to match container (after renderSystem is initialized)
        this.resize();
        
        // Setup window resize handler
        window.addEventListener('resize', () => {
            this.resize();
        });
        
        // Add visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // Track game loop state
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.frameCount = 0;
        
        console.log('Game constructor complete');
    }
    
    pause() {
        this.isPaused = true;
        console.log('Game paused');
    }
    
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('Game resumed');
            if (this.isRunning) {
                requestAnimationFrame((time) => this.gameLoop(time));
            }
        }
    }
    
    resize() {
        console.log('Resizing game...');
        
        // Use the gameContainer we already have from the constructor
        if (!this.gameContainer) {
            console.error('Game container not found');
            return;
        }
        
        const containerWidth = this.gameContainer.clientWidth;
        const containerHeight = this.gameContainer.clientHeight;
        
        // Set canvas size to match container
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Update render system with new dimensions
        if (this.renderSystem) {
            this.renderSystem.setSize(containerWidth, containerHeight);
        }
        
        // Log the new dimensions
        console.log(`Resized to: ${containerWidth}x${containerHeight}`);
        
        // If we have a render system, force a redraw
        if (this.renderSystem) {
            this.renderSystem.render(this.entityManager);
        }
    }
    
    init() {
        console.log('Initializing game...');
        try {
            // Create player ship
            console.log('Creating player ship...');
            this.player = new PlayerShip(this.canvas.width / 2, this.canvas.height / 2);
            console.log('Player ship created:', this.player);
            
            // Add to entity manager and register components
            this.entityManager.addEntity(this.player);
            
            // Set reference to entity manager for the player
            this.player.entityManager = this.entityManager;
            console.log('Player ship created and registered');

            // Spawn navigation buoy 1000m north of player
            this.spawnNavBuoy();
            
            // Clear any existing enemies
            console.log('Clearing any existing enemies...');
            this.entityManager.getEntities()
                .filter(entity => entity.team === 'enemy')
                .forEach(entity => this.entityManager.removeEntity(entity));
            
            // Create new enemy ships
            console.log('Spawning fresh enemies...');
            const enemies = this.spawnEnemies(3);
            console.log(`Successfully spawned ${enemies ? enemies.length : 0} enemy ships`);
            
            // Set up input handlers
            console.log('Setting up input handlers...');
            this.setupInputHandlers();
            
            // Set player in targeting system
            this.targetingSystem.setPlayer(this.player);
            console.log('Player set in targeting system');

            this.poiSystem.setPlayer(this.player);
            console.log('Player set in POI system');
            
            // Start the game loop
            console.log('Starting game loop...');
            this.isRunning = true;
            requestAnimationFrame((time) => this.gameLoop(time));
            console.log('Game initialization complete');
        } catch (error) {
            console.error('Error during game initialization:', error);
        }
    }
    
    spawnTestShip(x, y) {
        // Get player position (or use center of screen if no player)
        const playerX = this.player ? this.player.components.position.x : this.canvas.width / 2;
        const playerY = this.player ? this.player.components.position.y : this.canvas.height / 2;
        
        console.log('Player position:', { x: playerX, y: playerY });
        
        // Place test ship at a visible distance from player
        const distance = 100; // Pixels
        const angle = Math.PI / 4; // 45-degree angle
        
        // Calculate position relative to player
        const testX = playerX + Math.cos(angle) * distance;
        const testY = playerY + Math.sin(angle) * distance;
        
        console.log(`Creating test ship at (${testX.toFixed(1)}, ${testY.toFixed(1)})`);
        console.log(`Distance from player: ${distance} pixels`);
        
        try {
            // Clear any existing test ships first
            const existingTestShips = this.entityManager.getEntities().filter(e => e.id && e.id.startsWith('test-ship'));
            for (const ship of existingTestShips) {
                this.entityManager.removeEntity(ship);
            }
            
            // Create a ship with fixed properties for reliable testing
            const enemy = new EnemyShip(testX, testY, {
                name: 'Test Orbiter',
                shipType: 'Rifter',  // Use a specific ship type
                initialVelocity: {
                    x: 0,  // Start with no velocity
                    y: 0   // Start with no velocity
                },
                // Set specific orbit parameters
                orbitDistance: distance,  // Use the same distance we spawned at
                orbitSpeed: 1.0           // Normal orbit speed
            });
            
            // Ensure ID is predictable for debugging
            enemy.id = 'test-ship-' + Date.now();
            
            // Assign entity manager reference
            enemy.entityManager = this.entityManager;
            
            // Add to entity manager BEFORE setting up any state
            this.entityManager.addEntity(enemy);
            
            // Force the ship to be in attacking state AFTER it's added to the entity manager
            enemy.state = 'attacking';
            enemy.target = this.player;
            
            // Give it initial orbital velocity
            const perpX = -(testY - playerY) / distance;
            const perpY = (testX - playerX) / distance;
            const orbitSpeed = 30; // Pixels per second
            
            enemy.components.velocity.x = perpX * orbitSpeed;
            enemy.components.velocity.y = perpY * orbitSpeed;
            
            // Add custom update method that will force orbiting
            const originalUpdate = enemy.update;
            enemy.update = function(deltaTime, playerShip) {
                // Call original update first
                originalUpdate.call(this, deltaTime, playerShip);
                
                // Force orbiting behavior
                if (playerShip && this.state === 'attacking') {
                    this.orbitTarget(playerShip, distance, 1.0);
                }
            };
            
            console.log('Test ship created with components:', Object.keys(enemy.components));
            console.log('Test ship position:', enemy.components.position);
            console.log('Test ship velocity:', enemy.components.velocity);
            console.log('Test ship renderable:', enemy.components.renderable);
            
            // Check if the entity manager properly registered this entity
            const allEntities = this.entityManager.getEntities();
            const entitiesWithPosVel = this.entityManager.getEntitiesWithComponents('position', 'velocity');
            const renderableEntities = this.entityManager.getEntitiesWithComponents('position', 'renderable');
            
            console.log(`Entity manager has ${allEntities.length} total entities`);
            console.log(`Entity manager has ${entitiesWithPosVel.length} entities with position and velocity`);
            console.log(`Entity manager has ${renderableEntities.length} entities with position and renderable`);
            console.log('Renderable entities:', renderableEntities.map(e => ({
                id: e.id,
                position: e.components.position,
                renderable: e.components.renderable
            })));
            
            return enemy;
        } catch (error) {
            console.error('Error creating test ship:', error);
            return null;
        }
    }

    spawnNavBuoy() {
        if (!this.player) return null;

        const scale = 0.01; // meters to pixels
        const playerPos = this.player.components.position;
        const x = playerPos.x;
        const y = playerPos.y - 1000 * scale;

        const buoy = new NavBuoy(x, y);
        this.entityManager.addEntity(buoy);
        return buoy;
    }
    
    spawnEnemies(count) {
        console.log(`Spawning ${count} enemies`);
        const enemies = [];
        
        for (let i = 0; i < count; i++) {
            try {
                // Calculate position by placing ships at a distance from the player
                const orbitDistance = 5000; // 5km initial distance
                
                // Get player position (center of screen if no player exists)
                const playerX = this.player ? this.player.components.position.x : this.canvas.width / 2;
                const playerY = this.player ? this.player.components.position.y : this.canvas.height / 2;
                
                // Calculate random angle around the player
                const angle = Math.random() * Math.PI * 2;
                
                // Convert orbit distance from game units (meters) to screen pixels
                const pixelDistance = orbitDistance * 0.01; // Apply scale factor
                
                // Calculate position around the player
                const x = playerX + Math.cos(angle) * pixelDistance;
                const y = playerY + Math.sin(angle) * pixelDistance;
                
                console.log(`Creating enemy at (${x.toFixed(1)}, ${y.toFixed(1)})`);
                
                // Create enemy ship with a specific ship type
                const shipTypes = ['Rifter', 'Breacher', 'Jaguar'];
                const shipType = shipTypes[Math.floor(Math.random() * shipTypes.length)];
                
                // Set initial velocity for movement
                const randomAngle = Math.random() * Math.PI * 2;
                const speed = 100 + Math.random() * 250; // 100-350 m/s
                
                const enemy = new EnemyShip(x, y, {
                    shipType: shipType,
                    initialVelocity: {
                        x: Math.cos(randomAngle) * speed,
                        y: Math.sin(randomAngle) * speed
                    }
                });
                
                // Assign entity manager reference
                enemy.entityManager = this.entityManager;
                
                // Add to entity manager - this will automatically register all components
                this.entityManager.addEntity(enemy);
                
                // Log the created enemy for debugging
                console.log(`Enemy ${i+1} created with ID: ${enemy.id}`, {
                    position: enemy.components.position,
                    velocity: enemy.components.velocity,
                    renderable: enemy.components.renderable,
                    components: Object.keys(enemy.components)
                });
                
                // Force enemy to orbit player
                enemy.state = 'attacking';
                if (typeof enemy.orbitTarget === 'function') {
                    // Give initial orbital velocity
                    const angle = Math.random() * Math.PI * 2;
                    enemy.components.velocity.x = Math.cos(angle) * 50;
                    enemy.components.velocity.y = Math.sin(angle) * 50;
                }
                
                enemies.push(enemy);
            } catch (error) {
                console.error(`Error creating enemy ${i+1}:`, error);
            }
        }
        
        // Verify entities in the entity manager
        const allEntities = this.entityManager.getEntities();
        const entitiesWithPosVel = this.entityManager.getEntitiesWithComponents('position', 'velocity');
        const renderableEntities = this.entityManager.getEntitiesWithComponents('position', 'renderable');
        
        console.log(`Entity manager has ${allEntities.length} total entities`);
        console.log(`Entities with position and velocity: ${entitiesWithPosVel.length}`);
        console.log(`Entities with position and renderable: ${renderableEntities.length}`);
        
        return enemies;
    }
    
    setupInputHandlers() {
        // Module buttons
        document.querySelectorAll('.module-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.module-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Handle module activation
                this.handleModuleActivation(e.target.dataset.module);
            });
        });
        
        // Canvas click for targeting
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Find clicked entity
            const clickedEntity = this.findEntityAtPosition(x, y);
            if (clickedEntity && clickedEntity !== this.player) {
                this.setTarget(clickedEntity);
            } else {
                this.clearTarget();
            }
        });
    }
    
    findEntityAtPosition(x, y) {
        // Simple distance-based check for now
        const entities = this.entityManager.getEntities();
        for (const entity of entities) {
            if (entity === this.player) continue;
            
            const dx = entity.x - x;
            const dy = entity.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) { // Hitbox radius
                return entity;
            }
        }
        return null;
    }
    
    setTarget(entity) {
        this.target = entity;
        document.getElementById('target-name').textContent = entity.name || 'Unknown Target';
    }
    
    clearTarget() {
        this.target = null;
        document.getElementById('target-name').textContent = 'No Target';
        document.getElementById('target-distance').textContent = '-';
        document.getElementById('target-velocity').textContent = '-';
    }
    
    handleModuleActivation(moduleType) {
        if (!this.target) return;
        
        switch (moduleType) {
            case 'weapon':
                this.player.attack(this.target);
                break;
            case 'propulsion':
                this.player.orbit(this.target);
                break;
            case 'shield':
                this.player.activateShield();
                break;
            case 'armor':
                this.player.activateArmorRepair();
                break;
        }
    }
    
    gameLoop(timestamp) {
        try {
            // Skip updates if paused
            if (this.isPaused) {
                return;
            }
            
            // Debug: Log every 60 frames (approximately once per second)
            if (!this.frameCount) this.frameCount = 0;
            this.frameCount++;
            if (this.frameCount % 60 === 0) {
                console.log(`Game loop running - Frame ${this.frameCount}`, {
                    entities: this.entityManager.getEntities().length,
                    player: !!this.player,
                    isRunning: this.isRunning
                });
            }
            
            // Calculate delta time
            if (this.lastTime === 0) this.lastTime = timestamp;
            this.deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
            this.lastTime = timestamp;
            
            // Update game state
            this.update(this.deltaTime);
            
            // Render the game
            this.render();
            
            // Continue the game loop
            if (this.isRunning) {
                requestAnimationFrame((time) => this.gameLoop(time));
            }
        } catch (error) {
            console.error('Error in game loop:', error);
            this.isRunning = false;
        }
    }
    
    update(deltaTime) {
        // Update input
        this.inputManager.update();
        
        // Handle zoom controls
        if (this.inputManager.isKeyPressed('s')) {
            this.renderSystem.setZoom('S');
        } else if (this.inputManager.isKeyPressed('m')) {
            this.renderSystem.setZoom('M');
        } else if (this.inputManager.isKeyPressed('l')) {
            this.renderSystem.setZoom('L');
        }
        
        // Handle range marker toggle
        if (this.inputManager.isKeyPressed('r')) {
            const rangeMarkersEnabled = this.renderSystem.toggleRangeMarkers();
            console.log(`Range markers ${rangeMarkersEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Update player based on input
        if (this.player) {
            this.player.update(deltaTime, this.inputManager);
        }
        
        // Update systems
        this.aiSystem.update(deltaTime, this.entityManager, this.player);
        this.physicsSystem.update(deltaTime, this.entityManager);
        this.targetingSystem.update(deltaTime, this.entityManager);
        this.poiSystem.update(deltaTime, this.entityManager);
        
        // Update other entities
        const entities = this.entityManager.getEntities();
        for (const entity of entities) {
            if (entity !== this.player && entity.update) {
                // For enemy ships, pass the player ship as parameter
                if (entity.constructor.name === 'EnemyShip') {
                    entity.update(deltaTime, this.player);
                } else {
                    // For other entities, pass the input manager
                    entity.update(deltaTime, this.inputManager);
                }
            }
        }
        
        // Check for tab key press to cycle through targets
        if (this.inputManager.isKeyPressed('tab')) {
            this.cycleTargets();
        }
        
        // Check for 't' key press to spawn test ship
        if (this.inputManager.isKeyPressed('t')) {
            console.log('T key pressed - spawning test ship');
            this.spawnTestShip();
        }
        
        // Check for 'q' key press to restart game
        if (this.inputManager.isKeyPressed('q')) {
            console.log('Q key pressed - restarting game');
            // Restart by reloading the page for now
            window.location.reload();
        }
        
        // Check for 'escape' key press to deselect target
        if (this.inputManager.isKeyPressed('escape')) {
            if (this.player && this.player.target) {
                console.log('Escape key pressed - deselecting target');
                this.player.target = null;
            }
        }
        
        // Reset pressed keys for next frame
        this.inputManager.resetPressedKeys();
        
        // Update target info
        this.updateTargetInfo();
    }
    
    updateTargetInfo() {
        // Update target info if we have a target
        if (this.target && this.player) {
            const dx = this.target.x - this.player.x;
            const dy = this.target.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            document.getElementById('target-distance').textContent = `${Math.round(distance)}m`;
            
            // Calculate relative velocity
            const vx = this.target.velocityX - this.player.velocityX;
            const vy = this.target.velocityY - this.player.velocityY;
            const speed = Math.sqrt(vx * vx + vy * vy);
            document.getElementById('target-velocity').textContent = `${Math.round(speed * 10) / 10} m/s`;
        }
        
        // Update ship status bars and values
        if (this.player) {
            const health = this.player.getComponent('health');
            const energy = this.player.getComponent('energy');
            
            // Helper function to update status bar and tooltip
            const updateStatusBar = (type, current, max, isPercentage = true) => {
                const bar = document.getElementById(`${type}-bar`);
                const label = bar.closest('.tooltip').querySelector('.status-value');
                const tooltip = bar.closest('.tooltip').querySelector('.tooltiptext');
                
                const currentRounded = Math.round(current);
                const maxRounded = Math.round(max);
                const pct = Math.max(0, Math.min(100, (current / max) * 100));
                
                // Update bar width and value
                bar.style.width = `${pct}%`;
                
                // Update displayed value
                if (isPercentage) {
                    const value = Math.round((current / max) * 100);
                    bar.setAttribute('data-value', `${value}%`);
                    label.textContent = `${value}%`;
                    tooltip.innerHTML = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${value}%`;
                } else {
                    bar.setAttribute('data-value', `${currentRounded}/${maxRounded}`);
                    label.textContent = `${currentRounded}/${maxRounded}`;
                    tooltip.innerHTML = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${currentRounded}/${maxRounded}`;
                }
                
                // Add tooltip description
                switch(type) {
                    case 'shield':
                        tooltip.innerHTML += '<br>Absorbs damage before armor';
                        break;
                    case 'armor':
                        tooltip.innerHTML += '<br>Reduces damage to hull';
                        break;
                    case 'hull':
                        tooltip.innerHTML += '<br>Ship integrity';
                        break;
                    case 'capacitor':
                        tooltip.innerHTML += '<br>Powers ship modules';
                        break;
                }
            };
            
            // Update each status bar
            updateStatusBar('shield', health.shield || 0, 100);
            updateStatusBar('armor', health.armor || 0, 100);
            updateStatusBar('hull', health.current, health.max, false);
            updateStatusBar('capacitor', energy.current, energy.max);
        }
    }
    
    render() {
        // Debug log
        if (this.frameCount % 60 === 0) {
            console.log('Render method called');
        }
        
        try {
            // Clear the canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Render all entities, passing the player ship for zoom centering
            this.renderSystem.render(this.entityManager, this.player);
            
            // Draw targeting reticle if target is selected
            if (this.target) {
                this.renderSystem.drawTargetReticle(this.target);
            }
            
            // Render debug info if enabled
            if (this.debug) {
                this.renderDebugInfo();
            }
        } catch (error) {
            console.error('Error in render:', error);
        }
    }
    
    renderDebugInfo() {
        const ctx = this.ctx;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const fps = Math.round(1 / this.deltaTime);
        const entities = this.entityManager.getEntities().length;
        
        ctx.fillText(`FPS: ${fps}`, 10, 10);
        ctx.fillText(`Entities: ${entities}`, 10, 30);
        
        if (this.player) {
            const pos = this.player.getComponent('position');
            ctx.fillText(`Player: (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 10, 50);
        }
    }
    
    cycleTargets() {
        const enemies = this.entityManager.getEntities().filter(e => e.constructor.name === 'EnemyShip');
        if (enemies.length === 0) return;
        
        if (!this.player.target) {
            // No current target, select the first enemy
            this.player.target = enemies[0];
        } else {
            // Find the current target's index
            const currentIndex = enemies.findIndex(e => e === this.player.target);
            // Select the next enemy (wrap around to 0 if at the end)
            const nextIndex = (currentIndex + 1) % enemies.length;
            this.player.target = enemies[nextIndex];
        }
        
        console.log(`Selected target: ${this.player.target.name || this.player.target.id}`);
    }
    
    // ... rest of the code remains the same ...
}

// Create and start the game
console.log('Creating game instance...');
let game = null;

// Initialize the game when the DOM is fully loaded
const initGame = () => {
    console.log('=== initGame() called ===');
    console.log('Document state:', document.readyState);
    
    // Check DOM elements
    checkDOM();
    
    try {
        // Create the game instance
        console.log('Creating new Game instance...');
        game = new Game();
        console.log('Game instance created successfully:', game);
        
        window.game = game; // Make it globally accessible
        console.log('Game instance assigned to window.game');
        
        // Initialize the game (this starts the game loop)
        console.log('Calling game.init()...');
        game.init();
        
        console.log('Game initialized successfully!');
    } catch (error) {
        console.error('Failed to start the game:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            game: game,
            canvas: document.getElementById('game-canvas')
        });
    }
};

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM already loaded, initialize immediately
    console.log('Document already loaded, initializing immediately...');
    initGame();
}
