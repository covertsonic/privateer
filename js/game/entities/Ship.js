import { Entity } from '../ecs/Entity.js';

export class Ship extends Entity {
    constructor(x, y, options = {}) {
        super();
        
        // Default ship properties
        this.name = options.name || 'Unnamed Ship';
        this.team = options.team || 'neutral';
        
        // Add position component
        this.addComponent('position', { x, y });
        
        // Add velocity component
        this.addComponent('velocity', { 
            x: 0, 
            y: 0,
            maxSpeed: options.maxSpeed || 200,
            acceleration: options.acceleration || 100,
            rotationSpeed: options.rotationSpeed || 3
        });
        
        // Add rotation component
        this.addComponent('rotation', { 
            angle: options.angle || Math.PI / 2 // Point up by default
        });
        
        // Add renderable component
        this.addComponent('renderable', {
            type: 'ship',
            color: options.color || '#4a8cff',
            zIndex: 10
        });
        
        // Add health component
        this.addComponent('health', {
            max: options.maxHealth || 100,
            current: options.health || 100,
            shield: options.shield || 50,
            armor: options.armor || 30
        });
        
        // Add energy component (capacitor)
        this.addComponent('energy', {
            max: options.maxEnergy || 100,
            current: options.energy || 100,
            rechargeRate: options.energyRechargeRate || 5 // per second
        });
        
        // Add collider component
        this.addComponent('collider', {
            radius: options.colliderRadius || 10,
            type: 'ship'
        });
        
        // Ship state
        this.target = null;
        this.orbitTarget = null;
        this.orbitDistance = options.orbitDistance || 100;
        this.orbitSpeed = options.orbitSpeed || 1;
        this.weapons = [];
        this.modules = [];
        
        // Initialize ship modules
        this.initializeModules();
    }
    
    initializeModules() {
        // To be overridden by subclasses
    }
    
    update(deltaTime, inputManager) {
        const position = this.components.position;
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        const energy = this.components.energy;
        
        // Update modules
        for (const module of this.modules) {
            if (module.update) {
                module.update(deltaTime);
            }
        }
        
        // Recharge energy
        if (energy && energy.current < energy.max) {
            energy.current = Math.min(energy.max, energy.current + energy.rechargeRate * deltaTime);
        }
        
        // Apply drag
        velocity.x *= 0.98;
        velocity.y *= 0.98;
        
        // Update position
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
        
        // Keep ship in bounds
        this.keepInBounds();
    }
    
    keepInBounds() {
        const position = this.components.position;
        const canvas = document.getElementById('game-canvas');
        
        if (!canvas) return;
        
        const buffer = 50; // Buffer zone before bouncing
        
        // Bounce off edges
        if (position.x < buffer) {
            position.x = buffer;
            this.components.velocity.x *= -0.5;
        } else if (position.x > canvas.width - buffer) {
            position.x = canvas.width - buffer;
            this.components.velocity.x *= -0.5;
        }
        
        if (position.y < buffer) {
            position.y = buffer;
            this.components.velocity.y *= -0.5;
        } else if (position.y > canvas.height - buffer) {
            position.y = canvas.height - buffer;
            this.components.velocity.y *= -0.5;
        }
    }
    
    // Set a target to orbit
    orbit(target, distance = null, speed = null) {
        if (!target) {
            this.orbitTarget = null;
            this.removeComponent('orbiting');
            return;
        }
        
        this.orbitTarget = target;
        this.orbitDistance = distance || this.orbitDistance;
        this.orbitSpeed = speed || this.orbitSpeed;
        
        this.addComponent('orbiting', {
            target: target,
            distance: this.orbitDistance,
            speed: this.orbitSpeed
        });
    }
    
    // Attack a target
    attack(target) {
        if (!target) return;
        
        // Find a weapon that can fire
        const weapon = this.weapons.find(w => w.canFire());
        if (weapon) {
            weapon.fire(target);
        }
    }
    
    // Take damage
    takeDamage(amount, damageType = 'kinetic') {
        const health = this.components.health;
        
        // Apply damage to shield first, then armor, then hull
        if (health.shield > 0) {
            health.shield -= amount;
            if (health.shield < 0) {
                amount = Math.abs(health.shield); // Remaining damage
                health.shield = 0;
            } else {
                amount = 0; // All damage absorbed by shield
            }
        }
        
        if (amount > 0 && health.armor > 0) {
            // Armor reduces damage by 50%
            const armorDamage = amount * 0.5;
            health.armor -= armorDamage;
            if (health.armor < 0) {
                amount = Math.abs(health.armor) * 2; // Remaining damage (reverse the 50% reduction)
                health.armor = 0;
            } else {
                amount = 0; // All damage absorbed by armor
            }
        }
        
        // Apply remaining damage to hull
        if (amount > 0) {
            health.current -= amount;
            if (health.current <= 0) {
                this.destroy();
            }
        }
    }
    
    // Repair the ship
    repair(amount) {
        const health = this.components.health;
        health.current = Math.min(health.current + amount, health.max);
    }
    
    // Activate shield
    activateShield() {
        // Find and activate shield module if available
        const shieldModule = this.modules.find(m => m.type === 'shield');
        if (shieldModule && shieldModule.activate) {
            shieldModule.activate();
        }
    }
    
    // Activate armor repair
    activateArmorRepair() {
        // Find and activate armor repair module if available
        const armorModule = this.modules.find(m => m.type === 'armor');
        if (armorModule && armorModule.activate) {
            armorModule.activate();
        }
    }
    
    // Handle ship destruction
    destroy() {
        // Emit destruction event or handle cleanup
        console.log(`${this.name} has been destroyed!`);
        // TODO: Add explosion effect
        
        // Remove from game
        if (this.game) {
            this.game.entityManager.removeEntity(this);
        }
    }
}
