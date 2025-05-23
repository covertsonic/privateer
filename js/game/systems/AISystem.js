/**
 * AISystem - Handles AI behavior for enemy ships
 */
export class AISystem {
    constructor() {
        // Configuration for AI behaviors
        this.config = {
            attackRange: 300,        // Distance at which AI will engage
            orbitDistance: 250,      // Preferred orbit distance
            fleeHealthPercent: 0.2,  // Health percentage to flee at
            updateInterval: 0.1,     // How often to update AI decisions (seconds)
            minVelocity: 5,         // Minimum velocity for ships
            orbitSpeedFactor: 0.7,   // Orbit speed as fraction of max speed
            defaultState: 'orbit'    // Default behavior state: 'orbit', 'idle', or 'attacking'
        };
        
        this.updateTimers = new Map();
    }
    
    update(deltaTime, entityManager, playerShip) {
        if (!playerShip) return;
        
        // Get all entities with AI components
        const aiEntities = entityManager.getEntities().filter(entity => 
            entity.constructor.name === 'EnemyShip' && 
            entity.components.position &&
            entity.components.velocity
        );
        
        for (const entity of aiEntities) {
            // Update timer for this entity
            let timer = this.updateTimers.get(entity.id) || 0;
            timer += deltaTime;
            
            // Only update AI decisions at intervals
            if (timer >= this.config.updateInterval) {
                this.updateAI(entity, playerShip, entityManager);
                timer = 0;
            }
            
            this.updateTimers.set(entity.id, timer);
        }
        
        // Clean up timers for removed entities
        for (const [entityId, timer] of this.updateTimers) {
            if (!aiEntities.find(e => e.id === entityId)) {
                this.updateTimers.delete(entityId);
            }
        }
    }
    
    updateAI(entity, playerShip, entityManager) {
        const position = entity.components.position;
        const velocity = entity.components.velocity;
        const health = entity.components.health;
        
        if (!position || !velocity) return;
        
        // Calculate distance to player
        const dx = playerShip.components.position.x - position.x;
        const dy = playerShip.components.position.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Ensure ships always have some velocity
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (currentSpeed < this.config.minVelocity) {
            // Apply random velocity if ship is too slow
            const randomAngle = Math.random() * Math.PI * 2;
            velocity.x = Math.cos(randomAngle) * this.config.minVelocity;
            velocity.y = Math.sin(randomAngle) * this.config.minVelocity;
        }
        
        // Determine AI state based on conditions
        if (health && health.current / health.max < this.config.fleeHealthPercent) {
            entity.state = 'fleeing';
        } else if (distance < this.config.attackRange) {
            entity.state = 'attacking';
        } else {
            // Use the default state from config instead of always 'idle'
            entity.state = this.config.defaultState;
        }
        
        // Execute behavior based on state
        switch (entity.state) {
            case 'attacking':
                this.executeAttackBehavior(entity, playerShip, distance);
                break;
            case 'fleeing':
                this.executeFleeBehavior(entity, playerShip);
                break;
            case 'orbit':
                this.executeOrbitBehavior(entity, playerShip, distance);
                break;
            case 'idle':
            default:
                this.executeIdleBehavior(entity);
                break;
        }
    }
    
    executeAttackBehavior(entity, target, currentDistance) {
        const position = entity.components.position;
        const velocity = entity.components.velocity;
        const rotation = entity.components.rotation;
        
        // Calculate direction to target
        const dx = target.components.position.x - position.x;
        const dy = target.components.position.y - position.y;
        
        // Set target for the entity
        entity.target = target;
        
        // Try to maintain optimal distance
        if (currentDistance > this.config.orbitDistance * 1.2) {
            // Move closer
            const angle = Math.atan2(dy, dx);
            const speed = velocity.maxSpeed * 0.7;
            velocity.x = Math.cos(angle) * speed;
            velocity.y = Math.sin(angle) * speed;
        } else if (currentDistance < this.config.orbitDistance * 0.8) {
            // Move away
            const angle = Math.atan2(dy, dx);
            const speed = velocity.maxSpeed * 0.5;
            velocity.x = -Math.cos(angle) * speed;
            velocity.y = -Math.sin(angle) * speed;
        } else {
            // Orbit at current distance
            this.executeOrbitBehavior(entity, target, currentDistance);
        }
        
        // Update rotation to face target
        if (rotation) {
            rotation.angle = Math.atan2(dy, dx);
        }
    }
    
    executeOrbitBehavior(entity, target, distance) {
        const position = entity.components.position;
        const velocity = entity.components.velocity;
        const rotation = entity.components.rotation;
        
        // Calculate direction vector to target
        const dx = target.components.position.x - position.x;
        const dy = target.components.position.y - position.y;
        
        // Normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
        
        const nx = dx / length;
        const ny = dy / length;
        
        // Maintain optimal orbit distance
        let radiusAdjustment = 0;
        const desiredDistance = this.config.orbitDistance;
        
        if (Math.abs(distance - desiredDistance) > 20) {
            // If we're too far or too close, adjust our orbit
            radiusAdjustment = (distance - desiredDistance) * 0.05;
        }
        
        // Perpendicular vector for circular motion (90 degrees)
        // Choose clockwise or counter-clockwise based on entity ID for variety
        const direction = parseInt(entity.id.substr(-1), 36) % 2 === 0 ? 1 : -1;
        const perpX = -ny * direction;
        const perpY = nx * direction;
        
        // Set velocity for circular motion
        const orbitSpeed = velocity.maxSpeed * this.config.orbitSpeedFactor;
        velocity.x = perpX * orbitSpeed;
        velocity.y = perpY * orbitSpeed;
        
        // Add adjustment to maintain desired orbit distance
        velocity.x -= nx * radiusAdjustment;
        velocity.y -= ny * radiusAdjustment;
        
        // Update rotation to face perpendicular to orbit direction (like real ships)
        if (rotation) {
            // Calculate the direction of movement
            rotation.angle = Math.atan2(velocity.y, velocity.x);
        }
        
        // Set entity target for weapons
        entity.target = target;
    }
    
    executeFleeBehavior(entity, threat) {
        const position = entity.components.position;
        const velocity = entity.components.velocity;
        const rotation = entity.components.rotation;
        
        // Calculate direction away from threat
        const dx = position.x - threat.components.position.x;
        const dy = position.y - threat.components.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize and apply max speed
            const angle = Math.atan2(dy, dx);
            velocity.x = Math.cos(angle) * velocity.maxSpeed;
            velocity.y = Math.sin(angle) * velocity.maxSpeed;
            
            // Update rotation
            if (rotation) {
                rotation.angle = angle;
            }
        }
        
        // Clear target when fleeing
        entity.target = null;
    }
    
    executeIdleBehavior(entity) {
        const velocity = entity.components.velocity;
        
        // Slow down when idle
        velocity.x *= 0.95;
        velocity.y *= 0.95;
        
        // Clear target when idle
        entity.target = null;
    }
}
