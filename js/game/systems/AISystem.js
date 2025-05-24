/**
 * AISystem - Handles AI behavior for enemy ships
 */
export class AISystem {
    constructor() {
        // Configuration for AI behaviors
        this.config = {
            attackRange: 60,         // Distance at which AI will engage (6km * 0.01 scaleFactor)
            minOrbitDistancePixels: 20, // Minimum orbit distance (2km * 0.01 scaleFactor)
            maxOrbitDistancePixels: 50, // Maximum orbit distance (5km * 0.01 scaleFactor)
            fleeHealthPercent: 0.2,  // Health percentage to flee at
            updateInterval: 0.1,     // How often to update AI decisions (seconds)
            minVelocity: 2,          // Minimum velocity for ships
            orbitSpeedFactor: 0.5,   // Orbit speed as fraction of max speed
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
        
        // Assign a persistent desired orbit distance to the entity if it doesn't have one
        if (entity.desiredOrbitDistancePixels === undefined) {
            if (this.config.minOrbitDistancePixels !== undefined && this.config.maxOrbitDistancePixels !== undefined) {
                entity.desiredOrbitDistancePixels = Math.random() * 
                    (this.config.maxOrbitDistancePixels - this.config.minOrbitDistancePixels) + 
                    this.config.minOrbitDistancePixels;
                // console.log(`Entity ${entity.id} assigned orbit: ${entity.desiredOrbitDistancePixels.toFixed(2)}px`); // For debugging
            } else {
                // Fallback if config is somehow missing these, though it shouldn't be
                entity.desiredOrbitDistancePixels = 35; // Default to mid-range (3.5km scaled)
                // console.warn("AISystem config missing min/maxOrbitDistancePixels, using fallback for entity", entity.id);
            }
        }
        
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
        let isOrbitingThisTick = false; // Flag to track if orbiting behavior was chosen

        // Calculate direction to target
        const dx = target.components.position.x - position.x;
        const dy = target.components.position.y - position.y;
        
        // Set target for the entity
        entity.target = target;
        
        // Charge if too far
        if (currentDistance > entity.desiredOrbitDistancePixels * 1.2) { // Use entity's desired orbit distance
            const angle = Math.atan2(dy, dx);
            const speed = velocity.maxSpeed;
            velocity.x = Math.cos(angle) * speed;
            velocity.y = Math.sin(angle) * speed;
        } else if (currentDistance < entity.desiredOrbitDistancePixels * 0.8) { // Use entity's desired orbit distance
            // Move away if too close
            const angle = Math.atan2(dy, dx);
            const speed = velocity.maxSpeed * 0.5;
            velocity.x = -Math.cos(angle) * speed;
            velocity.y = -Math.sin(angle) * speed;
        } else {
            // Orbit at current distance
            this.executeOrbitBehavior(entity, target, currentDistance);
            isOrbitingThisTick = true; // Set flag as orbiting behavior was executed
        }
        
        // Update rotation to face target ONLY if not orbiting
        if (rotation && !isOrbitingThisTick) {
            rotation.angle = Math.atan2(dy, dx);
        }
    }
    
    executeOrbitBehavior(entity, target, distance) {
        const position = entity.components.position;
        const velocity = entity.components.velocity;
        const rotation = entity.components.rotation;

        // Ensure the entity has a desired orbit distance
        const desiredDistance = entity.desiredOrbitDistancePixels;
        if (desiredDistance === undefined) {
            // console.error(`Entity ${entity.id} in executeOrbitBehavior has no desiredOrbitDistancePixels!`);
            // Fallback or early exit if critical information is missing
            // For now, let's use a default from config if available, or a hardcoded one.
            // This path should ideally not be hit if updateAI correctly assigns the property.
            const fallbackOrbit = (this.config.minOrbitDistancePixels + this.config.maxOrbitDistancePixels) / 2 || 35;
            // console.warn(`Using fallback orbit distance ${fallbackOrbit} for entity ${entity.id}`);
            entity.desiredOrbitDistancePixels = fallbackOrbit; // Assign it now to prevent repeated errors
            // desiredDistance = fallbackOrbit; // This line was missing, re-assign to use it in this call
            // Corrected: re-assign to the local const 'desiredDistance' for the current execution
            const correctedDesiredDistance = entity.desiredOrbitDistancePixels;
            if (correctedDesiredDistance === undefined) return; // Should not happen with the above assignment
            // Use correctedDesiredDistance below
        }

        // Calculate direction vector to target
        const dx = target.components.position.x - position.x;
        const dy = target.components.position.y - position.y;
        
        // Normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
        
        const nx = dx / length;
        const ny = dy / length;
        
        // Determine if we need to adjust orbit distance
        // Use the entity's specific desiredDistance for calculation
        const currentDesiredDistance = entity.desiredOrbitDistancePixels; // Ensure we use the potentially corrected one
        let radiusAdjustment = 0;
        
        // Simple proportional control for orbit distance
        if (Math.abs(distance - currentDesiredDistance) > 2) { // Use a smaller deadzone (e.g. 2 pixels) for finer control at small scales
            radiusAdjustment = (distance - currentDesiredDistance) * 0.05; // Slightly more aggressive adjustment factor
        }
        
        // Use consistent orbit direction based on entity ID
        const direction = parseInt(entity.id.substr(-1), 36) % 2 === 0 ? 1 : -1;
        
        // Calculate perpendicular vector for circular motion
        const perpX = -ny * direction;
        const perpY = nx * direction;
        
        // Use a more modest orbit speed
        const orbitSpeed = velocity.maxSpeed * this.config.orbitSpeedFactor;
        
        // Set base velocity for circular motion
        const baseVelocityX = perpX * orbitSpeed;
        const baseVelocityY = perpY * orbitSpeed;
        
        // Apply velocity with gradual adjustment (lerping)
        // This makes movement smoother by blending previous and new velocity
        const blendFactor = 0.08; // Lower = smoother but slower to respond
        velocity.x = velocity.x * (1 - blendFactor) + (baseVelocityX - nx * radiusAdjustment) * blendFactor;
        velocity.y = velocity.y * (1 - blendFactor) + (baseVelocityY - ny * radiusAdjustment) * blendFactor;
        
        // Update rotation to face direction of movement
        if (rotation) {
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
