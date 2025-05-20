import { Projectile } from '../entities/Projectile.js';

export class Weapon {
    constructor(ship, options = {}) {
        this.ship = ship;
        this.game = ship.game;
        
        // Weapon properties
        this.damage = options.damage || 10;
        this.fireRate = options.fireRate || 1.0; // shots per second
        this.range = options.range || 400;
        this.projectileSpeed = options.projectileSpeed || 500;
        this.energyCost = options.energyCost || 5;
        this.projectileColor = options.color || '#ffffff';
        this.projectileSize = options.size || 3;
        this.name = options.name || 'Weapon';
        
        // Firing state
        this.lastFired = 0;
        this.cooldown = 1 / this.fireRate; // seconds between shots
        this.isFiring = false;
        this.autoFire = options.autoFire !== undefined ? options.autoFire : true;
        
        // Audio
        this.sound = options.sound || null;
        this.volume = options.volume || 0.5;
    }
    
    update(deltaTime) {
        // Handle auto-firing
        if (this.autoFire && this.isFiring) {
            this.fire();
        }
    }
    
    startFiring() {
        this.isFiring = true;
        if (this.autoFire) {
            this.fire();
        }
    }
    
    stopFiring() {
        this.isFiring = false;
    }
    
    fire(target = null) {
        const currentTime = Date.now() / 1000; // Convert to seconds
        
        // Check if weapon is ready to fire
        if (currentTime - this.lastFired < this.cooldown) {
            return false;
        }
        
        // Check if ship has enough energy
        if (this.ship.components.energy.current < this.energyCost) {
            console.log('Not enough energy to fire weapon');
            return false;
        }
        
        // Consume energy
        this.ship.components.energy.current -= this.energyCost;
        
        // Create projectile
        this.createProjectile(target);
        
        // Update last fired time
        this.lastFired = currentTime;
        
        // Play sound if available
        if (this.sound) {
            const audio = new Audio(this.sound);
            audio.volume = this.volume;
            audio.play().catch(e => console.warn('Audio play failed:', e));
        }
        
        return true;
    }
    
    createProjectile(target) {
        if (!this.game) return null;
        
        const position = this.ship.components.position;
        const rotation = this.ship.components.rotation;
        
        // Calculate spawn position (slightly in front of the ship)
        const offset = 20; // Distance from ship center
        const spawnX = position.x + Math.cos(rotation.angle + Math.PI/2) * offset;
        const spawnY = position.y - Math.sin(rotation.angle + Math.PI/2) * offset;
        
        // Calculate initial velocity (ship velocity + projectile velocity)
        const shipVelocity = this.ship.components.velocity;
        const angle = rotation.angle + Math.PI/2; // Convert to standard angle
        const projectileVelocity = {
            x: Math.cos(angle) * this.projectileSpeed,
            y: -Math.sin(angle) * this.projectileSpeed
        };
        
        // Create projectile
        const projectile = new Projectile({
            x: spawnX,
            y: spawnY,
            velocity: {
                x: projectileVelocity.x + (shipVelocity?.x || 0),
                y: projectileVelocity.y + (shipVelocity?.y || 0)
            },
            damage: this.damage,
            range: this.range,
            color: this.projectileColor,
            size: this.projectileSize,
            owner: this.ship,
            target: target
        });
        
        // Add to game
        this.game.entityManager.addEntity(projectile);
        
        return projectile;
    }
    
    // Called when the weapon is activated (e.g., player presses fire button)
    activate() {
        if (this.autoFire) {
            this.startFiring();
        } else {
            this.fire();
        }
    }
    
    // Called when the weapon is deactivated (e.g., player releases fire button)
    deactivate() {
        this.stopFiring();
    }
    
    // Get time until next shot is available (0 if ready)
    getCooldownRemaining() {
        const currentTime = Date.now() / 1000;
        const timeSinceLastShot = currentTime - this.lastFired;
        return Math.max(0, this.cooldown - timeSinceLastShot);
    }
    
    // Get cooldown progress (0 to 1)
    getCooldownProgress() {
        return 1 - (this.getCooldownRemaining() / this.cooldown);
    }
}
