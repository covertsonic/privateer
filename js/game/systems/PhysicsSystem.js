export class PhysicsSystem {
    constructor() {
        this.gravity = 0; // No gravity in space
        this.drag = 0.98; // Small amount of drag to simulate space friction
        
        // Scale factor to convert m/s to pixel movement
        // This should match the range marker scale (0.01)
        this.scaleFactor = 0.01;
        
        // Additional velocity scaling factor to make ships move at
        // a reasonable speed that matches their velocity indicators
        // This is a gameplay adjustment factor
        // For realism, set to 1 so ship movement matches UI and range markers
        this.velocityGameplayFactor = 1;
    }
    
    update(deltaTime, entityManager) {
        // Ensure deltaTime is in seconds (if > 10, assume ms and convert)
        const deltaTimeSeconds = deltaTime > 10 ? deltaTime / 1000 : deltaTime;
        
        // console.group('PhysicsSystem Update');
        // console.log(`Processing physics with deltaTime: ${deltaTimeSeconds}s`);
        
        // Get all entities with position and velocity components
        const entities = entityManager.getEntitiesWithComponents('position', 'velocity');
        // console.log(`Found ${entities.length} entities with position and velocity`);
        
        if (entities.length === 0) {
            console.warn('No entities with position and velocity components found!');
            // console.groupEnd(); // Corresponds to 'PhysicsSystem Update'
            return;
        }
        
        // Process each entity
        for (const entity of entities) {
            const { position, velocity } = entity.components;
            
            // Skip if missing required components
            if (!position || !velocity) {
                console.warn('Entity missing position or velocity component:', {
                    id: entity.id,
                    type: entity.constructor.name,
                    hasPosition: !!position,
                    hasVelocity: !!velocity
                });
                continue;
            }
            
            const isEnemy = !entity.components.playerControlled;
            if (isEnemy) {
                // console.group(`Enemy Ship Update - ID: ${entity.id}`);
                // console.log(`Position before: (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
                // console.log(`Velocity: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)})`);
            }
            
            // Apply drag
            velocity.x *= 0.98;
            velocity.y *= 0.98;
            
            // Calculate movement in pixels
            const moveX = velocity.x * this.scaleFactor * this.velocityGameplayFactor * deltaTimeSeconds;
            const moveY = velocity.y * this.scaleFactor * this.velocityGameplayFactor * deltaTimeSeconds;
            
            // Update position
            position.x += moveX;
            position.y += moveY;
            
            // Keep in bounds if the entity has that method
            if (typeof entity.keepInBounds === 'function') {
                entity.keepInBounds();
            }
            
            if (isEnemy) {
                // console.log(`Position after: (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
                // console.log(`Moved by: (${moveX.toFixed(2)}, ${moveY.toFixed(2)})`);
            }
            
            // Apply gravity if entity is affected by it
            if (entity.components.gravityAffected) {
                velocity.y += this.gravity * deltaTimeSeconds;
            }
            
            // Update rotation if entity has angular velocity
            if (entity.components.rotation && entity.components.angularVelocity) {
                const { rotation, angularVelocity } = entity.components;
                rotation.angle += angularVelocity.speed * deltaTimeSeconds * 60;
                
                // Keep angle between 0 and 2*PI
                if (rotation.angle > Math.PI * 2) rotation.angle -= Math.PI * 2;
                if (rotation.angle < 0) rotation.angle += Math.PI * 2;
            }
            
            // Handle orbiting if entity is orbiting a target
            if (entity.components.orbiting) {
                this.updateOrbit(entity, deltaTime);
            }
        }
    }
    
    updateOrbit(entity, deltaTime) {
        const { orbiting } = entity.components;
        const { position } = entity.components;
        const target = orbiting.target;
        
        if (!target || !target.components.position) return;
        
        const targetPos = target.components.position;
        const dx = position.x - targetPos.x;
        const dy = position.y - targetPos.y;
        
        // Calculate current distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate desired orbit distance in pixels
        // EVE Online uses meters, we need to convert to our pixel scale
        const orbitDistanceMeters = orbiting.distance || 5000; // Default 5km
        const orbitDistancePixels = orbitDistanceMeters * this.scaleFactor;
        
        // Get the ship's max speed in m/s
        const shipMaxSpeed = entity.components.velocity?.maxSpeed || 365; // Default to Rifter speed
        
        // Calculate angular velocity (radians per second)
        // In a circular orbit: v = r * ω
        // So ω = v / r
        // Apply the same gameplay factor here to ensure orbiting matches linear movement
        const angularVelocity = (shipMaxSpeed * this.scaleFactor * this.velocityGameplayFactor) / orbitDistancePixels;
        
        // Time to complete one orbit in seconds: 2π / ω
        const orbitalPeriod = (2 * Math.PI) / angularVelocity;
        
        // Calculate current angle
        let currentAngle = Math.atan2(dy, dx);
        
        // Calculate new angle based on elapsed time
        // The orbit direction is determined by the orbit speed sign
        const orbitDirection = orbiting.speed >= 0 ? 1 : -1;
        const newAngle = currentAngle + (angularVelocity * orbitDirection * deltaTime);
        
        // Calculate the new position in orbit
        const newX = targetPos.x + Math.cos(newAngle) * orbitDistancePixels;
        const newY = targetPos.y + Math.sin(newAngle) * orbitDistancePixels;
        
        // Set the ship's velocity
        const velocity = entity.components.velocity;
        if (velocity) {
            // Calculate the tangential velocity vector
            // This is perpendicular to the radius
            const tangentialX = -Math.sin(newAngle) * orbitDirection;
            const tangentialY = Math.cos(newAngle) * orbitDirection;
            
            // Set the velocity components
            // We want velocity to display the actual ship speed in the UI,
            // but for movement calculations we apply the gameplay factor
            velocity.x = tangentialX * shipMaxSpeed;
            velocity.y = tangentialY * shipMaxSpeed;
            
            // Calculate the current distance error
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const distanceError = orbitDistancePixels - currentDistance;
            
            // Apply a small radial correction if needed
            if (Math.abs(distanceError) > 0.5) {
                const radialX = dx / currentDistance;
                const radialY = dy / currentDistance;
                const correctionFactor = distanceError * 0.5 * deltaTime; // Reduced correction for smoother orbits
                
                // Move towards or away from the orbit center
                position.x -= radialX * correctionFactor;
                position.y -= radialY * correctionFactor;
            }
        } else {
            // If no velocity component, just set position directly
            position.x = newX;
            position.y = newY;
        }
        
        // Update rotation to face direction of travel (tangential to orbit)
        if (entity.components.rotation) {
            entity.components.rotation.angle = newAngle + (Math.PI / 2) * orbitDirection;
        }
    }
    
    // Check for collisions between two entities
    checkCollision(entity1, entity2) {
        if (!entity1.components.position || !entity2.components.position) {
            return false;
        }
        
        const pos1 = entity1.components.position;
        const pos2 = entity2.components.position;
        
        // Simple distance-based collision
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Get collision radii (default to 10 if not specified)
        const radius1 = entity1.components.collider?.radius || 10;
        const radius2 = entity2.components.collider?.radius || 10;
        
        return distance < (radius1 + radius2);
    }
}
