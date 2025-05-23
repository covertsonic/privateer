import { Ship } from './Ship.js';
import { Weapon } from '../modules/Weapon.js';

export class EnemyShip extends Ship {
    constructor(x, y, options = {}) {
        super(x, y, {
            name: options.name || 'Enemy Ship',
            maxSpeed: options.maxSpeed || 180,
            acceleration: options.acceleration || 100,
            rotationSpeed: options.rotationSpeed || 2,
            maxHealth: options.maxHealth || 100,
            shield: options.shield || 50,
            armor: options.armor || 30,
            color: options.color || '#ff5555',
            orbitDistance: options.orbitDistance || 200,
            orbitSpeed: options.orbitSpeed || 1
        });
        
        // Set team for targeting
        this.team = 'enemy';
        this.isActive = true;
        this.id = 'enemy-' + Math.random().toString(36).substr(2, 9);
        
        // Ensure all required components for targeting are present
        if (!this.components) this.components = {};
        
        // Add or update ship component with name
        this.components.ship = this.components.ship || {};
        this.components.ship.name = options.name || 'Enemy Ship';
        
        // Make sure position is set
        if (!this.components.position) {
            this.components.position = { x: x, y: y };
        } else {
            this.components.position.x = x;
            this.components.position.y = y;
        }
        
        // Ensure velocity exists
        if (!this.components.velocity) {
            this.components.velocity = { x: 0, y: 0 };
        }
        
        // Ensure rotation exists
        if (!this.components.rotation) {
            this.components.rotation = { angle: 0 };
        }
        
        // Ensure health exists
        if (!this.components.health) {
            this.components.health = { 
                current: options.maxHealth || 100, 
                max: options.maxHealth || 100 
            };
        }
        
        // Ensure shield exists
        if (!this.components.shield) {
            this.components.shield = { 
                current: options.shield || 50, 
                max: options.shield || 50 
            };
        }
        
        // Ensure armor exists
        if (!this.components.armor) {
            this.components.armor = { 
                current: options.armor || 30, 
                max: options.armor || 30 
            };
        }
        
        // Add hull component if it doesn't exist
        if (!this.components.hull) {
            this.components.hull = { 
                current: options.maxHealth || 100, 
                max: options.maxHealth || 100 
            };
        }
        
        // AI behavior properties
        this.state = 'idle'; // idle, attacking, fleeing
        this.detectionRange = 400;
        this.attackRange = 300;
        this.fleeThreshold = 0.3; // Flee when health is below 30%
        this.lastStateChange = 0;
        this.stateCooldown = 2; // seconds
        this.target = null;
        this.lastShotTime = 0;
        this.shotDelay = 2; // seconds between shots
    }
    
    initializeModules() {
        // Add a basic weapon
        const weapon = new Weapon(this, {
            damage: 8,
            fireRate: 0.8, // shots per second
            range: this.attackRange,
            projectileSpeed: 400,
            energyCost: 3,
            color: '#ff9999',
            name: 'Light Laser'
        });
        
        this.weapons.push(weapon);
    }
    
    update(deltaTime, playerShip) {
        // Call parent update first
        super.update(deltaTime, {});
        
        // If no player ship is provided, do nothing
        if (!playerShip) return;
        
        // Update target to player ship
        this.target = playerShip;
        
        // Calculate distance to player
        const dx = playerShip.components.position.x - this.components.position.x;
        const dy = playerShip.components.position.y - this.components.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update AI state
        this.updateAIState(distance, playerShip);
        
        // Execute behavior based on current state
        switch (this.state) {
            case 'attacking':
                this.updateAttacking(deltaTime, distance, dx, dy);
                break;
            case 'fleeing':
                this.updateFleeing(deltaTime, dx, dy);
                break;
            case 'idle':
            default:
                this.updateIdle(deltaTime);
                break;
        }
    }
    
    updateAIState(distance, playerShip) {
        const currentTime = Date.now() / 1000; // Convert to seconds
        const healthPercent = this.components.health.current / this.components.health.max;
        
        // Don't change state too often
        if (currentTime - this.lastStateChange < this.stateCooldown) {
            return;
        }
        
        // Check if we should flee
        if (healthPercent < this.fleeThreshold && this.state !== 'fleeing') {
            this.setState('fleeing');
            return;
        }
        
        // Check if we should attack
        if (distance < this.detectionRange && this.state !== 'attacking' && this.state !== 'fleeing') {
            this.setState('attacking');
            return;
        }
        
        // Return to idle if player is too far away
        if (distance > this.detectionRange * 1.5 && this.state !== 'idle') {
            this.setState('idle');
            return;
        }
    }
    
    updateAttacking(deltaTime, distance, dx, dy) {
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Calculate angle to player
        let targetAngle = Math.atan2(-dy, dx);
        
        // Normalize angles for comparison
        let angleDiff = targetAngle - (rotation.angle - Math.PI/2);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Rotate towards player
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                rotation.angle += velocity.rotationSpeed * deltaTime;
            } else {
                rotation.angle -= velocity.rotationSpeed * deltaTime;
            }
        }
        
        // Move towards or away to maintain orbit distance
        const orbitDistance = this.orbitDistance || 200;
        if (distance > orbitDistance + 50) {
            // Move towards orbit distance
            const angle = rotation.angle;
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime;
        } else if (distance < orbitDistance - 50) {
            // Move away to maintain orbit distance
            const angle = rotation.angle + Math.PI; // Reverse direction
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 0.5;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 0.5;
        } else {
            // Orbit the player
            this.orbit(this.target, orbitDistance, this.orbitSpeed);
        }
        
        // Shoot at player if facing them
        if (Math.abs(angleDiff) < 0.5 && distance < this.attackRange) {
            this.tryShoot();
        }
    }
    
    updateFleeing(deltaTime, dx, dy) {
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Calculate angle away from player
        let targetAngle = Math.atan2(dy, -dx);
        
        // Normalize angles for comparison
        let angleDiff = targetAngle - (rotation.angle - Math.PI/2);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Rotate away from player
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                rotation.angle += velocity.rotationSpeed * deltaTime * 1.5; // Faster rotation when fleeing
            } else {
                rotation.angle -= velocity.rotationSpeed * deltaTime * 1.5;
            }
        }
        
        // Apply full thrust away from player
        const angle = rotation.angle;
        velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 1.2; // Faster when fleeing
        velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 1.2;
    }
    
    updateIdle(deltaTime) {
        // Simple wandering behavior
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Occasionally change direction
        if (Math.random() < 0.01) {
            rotation.angle += (Math.random() - 0.5) * 2;
        }
        
        // Apply small amount of thrust
        if (Math.random() < 0.1) {
            const angle = rotation.angle;
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 0.3;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 0.3;
        }
        
        // Limit speed when idling
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed > velocity.maxSpeed * 0.3) {
            velocity.x = (velocity.x / speed) * (velocity.maxSpeed * 0.3);
            velocity.y = (velocity.y / speed) * (velocity.maxSpeed * 0.3);
        }
    }
    
    tryShoot() {
        const currentTime = Date.now() / 1000; // Convert to seconds
        if (currentTime - this.lastShotTime > this.shotDelay && this.target) {
            this.attack(this.target);
            this.lastShotTime = currentTime;
        }
    }
    
    setState(newState) {
        if (this.state === newState) return;
        
        this.state = newState;
        this.lastStateChange = Date.now() / 1000; // Convert to seconds
        
        // Handle state exit/enter logic
        switch (newState) {
            case 'attacking':
                console.log(`${this.name} is now attacking`);
                break;
            case 'fleeing':
                console.log(`${this.name} is now fleeing`);
                // Stop orbiting when fleeing
                this.orbit(null);
                break;
            case 'idle':
                console.log(`${this.name} is now idle`);
                // Stop orbiting when idling
                this.orbit(null);
                break;
        }
    }
    
    destroy() {
        console.log(`${this.name} has been destroyed!`);
        // TODO: Add explosion effect
        
        // Remove from game
        if (this.game) {
            this.game.entityManager.removeEntity(this);
            
            // Notify game that an enemy was destroyed
            if (this.game.onEnemyDestroyed) {
                this.game.onEnemyDestroyed(this);
            }
        }
    }
}
