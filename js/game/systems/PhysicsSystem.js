export class PhysicsSystem {
    constructor() {
        this.gravity = 0; // No gravity in space
        this.drag = 0.98; // Small amount of drag to simulate space friction
    }
    
    update(entityManager, deltaTime) {
        const entities = entityManager.getEntitiesWithComponents('position', 'velocity');
        
        for (const entity of entities) {
            const { position, velocity } = entity.components;
            
            // Update position based on velocity
            position.x += velocity.x * deltaTime * 60; // Multiply by 60 to normalize for 60fps
            position.y += velocity.y * deltaTime * 60;
            
            // Apply drag
            velocity.x *= this.drag;
            velocity.y *= this.drag;
            
            // Apply gravity if entity is affected by it
            if (entity.components.gravityAffected) {
                velocity.y += this.gravity * deltaTime;
            }
            
            // Update rotation if entity has angular velocity
            if (entity.components.rotation && entity.components.angularVelocity) {
                const { rotation, angularVelocity } = entity.components;
                rotation.angle += angularVelocity.speed * deltaTime * 60;
                
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
        
        // Calculate desired velocity for circular orbit
        const targetDistance = orbiting.distance || 100;
        const orbitSpeed = orbiting.speed || 1;
        
        // Calculate angle to target
        let angle = Math.atan2(dy, dx);
        
        // Calculate desired position for orbit
        const desiredAngle = angle + (orbitSpeed * deltaTime);
        const desiredX = targetPos.x + Math.cos(desiredAngle) * targetDistance;
        const desiredY = targetPos.y + Math.sin(desiredAngle) * targetDistance;
        
        // Calculate velocity needed to reach desired position
        const velocity = entity.components.velocity;
        if (velocity) {
            // Simple approach: move towards desired position
            const moveSpeed = orbitSpeed * 5; // Adjust multiplier as needed
            velocity.x = (desiredX - position.x) * moveSpeed * deltaTime;
            velocity.y = (desiredY - position.y) * moveSpeed * deltaTime;
        } else {
            // If no velocity component, just set position directly
            position.x = desiredX;
            position.y = desiredY;
        }
        
        // Update rotation to face direction of orbit
        if (entity.components.rotation) {
            entity.components.rotation.angle = desiredAngle + Math.PI / 2;
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
