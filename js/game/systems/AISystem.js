/**
 * AISystem - Handles AI behavior for enemy ships
 */
export class AISystem {
    constructor() {
        // Configuration for AI behaviors
        this.config = {
            attackRange: 200,        // Distance at which AI will engage
            orbitDistance: 150,      // Preferred orbit distance
            fleeHealthPercent: 0.2,  // Health percentage to flee at
            updateInterval: 0.1      // How often to update AI decisions (seconds)
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
        
        // Determine AI state based on conditions
        if (health && health.current / health.max < this.config.fleeHealthPercent) {
            entity.state = 'fleeing';
        } else if (distance < this.config.attackRange) {
            entity.state = 'attacking';
        } else {
            entity.state = 'idle';
        }
        
        // Execute behavior based on state
        switch (entity.state) {
            case 'attacking':
                this.executeAttackBehavior(entity, playerShip, distance);
                break;
            case 'fleeing':
                this.executeFleeBehavior(entity, playerShip);
                break;
            case 'idle':
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
        
        // Calculate perpendicular direction for orbiting
        const dx = target.components.position.x - position.x;
        const dy = target.components.position.y - position.y;
        
        // Normalize
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
        
        const nx = dx / length;
        const ny = dy / length;
        
        // Perpendicular vector (90 degrees)
        const perpX = -ny;
        const perpY = nx;
        
        // Set velocity for circular motion
        const orbitSpeed = velocity.maxSpeed * 0.6;
        velocity.x = perpX * orbitSpeed;
        velocity.y = perpY * orbitSpeed;
        
        // Add slight inward force to maintain orbit
        const inwardForce = 0.1;
        velocity.x += nx * orbitSpeed * inwardForce;
        velocity.y += ny * orbitSpeed * inwardForce;
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
