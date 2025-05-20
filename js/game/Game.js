import { EntityManager } from './ecs/EntityManager.js';
import { InputManager } from './input/InputManager.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { TargetingSystem } from './systems/TargetingSystem.js';
import { PlayerShip } from './entities/PlayerShip.js';
import { EnemyShip } from './entities/EnemyShip.js';

export class Game {
    constructor() {
        console.log('Game constructor called');
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get 2D context from canvas');
            return;
        }
        
        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        
        console.log('Initializing game systems...');
        // Initialize game systems
        this.entityManager = new EntityManager();
        console.log('EntityManager initialized');
        
        this.inputManager = new InputManager();
        console.log('InputManager initialized');
        
        this.renderSystem = new RenderSystem(this.ctx);
        console.log('RenderSystem initialized');
        
        this.physicsSystem = new PhysicsSystem();
        console.log('PhysicsSystem initialized');
        
        this.targetingSystem = new TargetingSystem(this);
        console.log('TargetingSystem initialized');
        
        // Set canvas size to match window (after renderSystem is initialized)
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Game state
        this.player = null;
        
        console.log('Game constructor completed');
    }
    
    resize() {
        console.log('Resizing canvas...');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.renderSystem.setCanvasSize(this.canvas.width, this.canvas.height);
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
    }
    
    init() {
        console.log('Initializing game...');
        try {
            // Create player ship
            console.log('Creating player ship...');
            this.player = new PlayerShip(this.canvas.width / 2, this.canvas.height / 2);
            console.log('Player ship created:', this.player);
            
            this.entityManager.addEntity(this.player);
            console.log('Player ship added to entity manager');
            
            // Set player in targeting system
            this.targetingSystem.setPlayer(this.player);
            console.log('Player set in targeting system');
            
            // Create some enemy ships
            console.log('Spawning enemies...');
            this.spawnEnemies(3);
            
            // Set up input handlers
            console.log('Setting up input handlers...');
            this.setupInputHandlers();
            
            // Start the game loop
            console.log('Starting game loop...');
            this.isRunning = true;
            requestAnimationFrame((time) => this.gameLoop(time));
            console.log('Game initialization complete');
        } catch (error) {
            console.error('Error during game initialization:', error);
        }
    }
    
    spawnEnemies(count) {
        console.log(`Spawning ${count} enemies`);
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.canvas.width * 0.8 + this.canvas.width * 0.1;
            const y = Math.random() * this.canvas.height * 0.8 + this.canvas.height * 0.1;
            console.log(`Creating enemy at (${x}, ${y})`);
            const enemy = new EnemyShip(x, y);
            this.entityManager.addEntity(enemy);
            console.log(`Enemy ${i+1} created and added to entity manager`);
        }
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
        
        // Update player based on input
        if (this.player) {
            this.player.update(deltaTime, this.inputManager);
        }
        
        // Update game systems
        this.physicsSystem.update(this.deltaTime, this.entityManager);
        this.targetingSystem.update(this.deltaTime, this.entityManager);
        
        // Update all entities
        const entities = this.entityManager.getEntities();
        for (const entity of entities) {
            // Skip player since we already updated it separately
            if (entity !== this.player && entity.update) {
                // For enemy ships, pass the player ship as parameter
                if (entity.constructor.name === 'EnemyShip') {
                    entity.update(this.deltaTime, this.player);
                } else {
                    // For other entities, pass the input manager
                    entity.update(this.deltaTime, this.inputManager);
                }
            }
        }
        
        // Update target info
        this.updateTargetInfo();
    }
    
    updateTargetInfo() {
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
    }
    
    render() {
        try {
            // Clear the canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Render all entities
            this.renderSystem.render(this.entityManager);
            
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
}

// Start the game when the DOM is loaded
console.log('DOM content loaded, starting game...');
document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Game();
        game.init();
        window.game = game; // Make game accessible from console for debugging
        console.log('Game started successfully');
    } catch (error) {
        console.error('Failed to start game:', error);
    }
});
