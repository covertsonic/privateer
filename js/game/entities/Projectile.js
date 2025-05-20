export class Projectile {
    constructor(options = {}) {
        // Position and movement
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.velocity = {
            x: options.velocity?.x || 0,
            y: options.velocity?.y || 0
        };
        
        // Projectile properties
        this.speed = options.speed || 500;
        this.damage = options.damage || 10;
        this.range = options.range || 400;
        this.lifetime = options.lifetime || 2; // seconds
        this.age = 0;
        this.piercing = options.piercing || false;
        this.homing = options.homing || false;
        this.homingStrength = options.homingStrength || 2.0;
        this.homingRange = options.homingRange || 300;
        this.explosionRadius = options.explosionRadius || 0; // 0 means no explosion
        this.explosionDamage = options.explosionDamage || this.damage * 0.5;
        
        // Visual properties
        this.radius = options.radius || 3;
        this.color = options.color || '#ffffff';
        this.trailLength = options.trailLength || 10;
        this.trail = [];
        
        // Ownership and targeting
        this.owner = options.owner || null;
        this.target = options.target || null;
        this.team = options.team || 'neutral';
        
        // Game state
        this.isActive = true;
        this.distanceTraveled = 0;
        this.spawnTime = Date.now() / 1000; // Convert to seconds
        
        // Initialize trail with current position
        this.updateTrail();
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update age
        this.age += deltaTime;
        
        // Check lifetime
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }
        
        // Handle homing behavior if enabled
        if (this.homing && this.target && this.target.isActive) {
            this.updateHoming(deltaTime);
        }
        
        // Update position
        const prevX = this.x;
        const prevY = this.y;
        
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Update distance traveled
        const dx = this.x - prevX;
        const dy = this.y - prevY;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        // Check range
        if (this.distanceTraveled >= this.range) {
            this.destroy();
            return;
        }
        
        // Update trail
        this.updateTrail();
    }
    
    updateHoming(deltaTime) {
        // Calculate vector to target
        const dx = this.target.components.position.x - this.x;
        const dy = this.target.components.position.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only home if target is within range
        if (distance > this.homingRange) return;
        
        // Calculate current direction
        const currentAngle = Math.atan2(-this.velocity.y, this.velocity.x);
        
        // Calculate desired angle (towards target)
        const targetAngle = Math.atan2(-dy, dx);
        
        // Calculate angle difference
        let angleDiff = targetAngle - currentAngle;
        
        // Normalize angle to -PI to PI range
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Limit turning rate
        const maxTurn = this.homingStrength * deltaTime;
        angleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        
        // Calculate new direction
        const newAngle = currentAngle + angleDiff;
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        // Update velocity
        this.velocity.x = Math.cos(newAngle) * speed;
        this.velocity.y = -Math.sin(newAngle) * speed;
    }
    
    updateTrail() {
        // Add current position to trail
        this.trail.unshift({ x: this.x, y: this.y });
        
        // Limit trail length
        if (this.trail.length > this.trailLength) {
            this.trail.pop();
        }
    }
    
    onHit(target) {
        // Apply damage to target
        if (target.takeDamage) {
            target.takeDamage(this.damage, this.owner);
        }
        
        // Handle explosion if applicable
        if (this.explosionRadius > 0) {
            this.createExplosion();
        }
        
        // Destroy projectile unless it's piercing
        if (!this.piercing) {
            this.destroy();
        }
    }
    
    createExplosion() {
        // Notify game to create explosion effect
        if (this.game) {
            this.game.createExplosion({
                x: this.x,
                y: this.y,
                radius: this.explosionRadius,
                damage: this.explosionDamage,
                owner: this.owner,
                team: this.team
            });
        }
    }
    
    destroy() {
        this.isActive = false;
        
        // Notify game to remove this projectile
        if (this.game) {
            this.game.entityManager.removeEntity(this);
        }
    }
    
    draw(ctx) {
        if (!this.isActive) return;
        
        // Draw trail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineWidth = this.radius * 0.7;
            
            // Draw gradient trail
            for (let i = 0; i < this.trail.length - 1; i++) {
                const alpha = i / this.trail.length;
                const color = this.color;
                
                // Fade out trail
                ctx.strokeStyle = `${color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`;
                
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        // Draw projectile
        ctx.save();
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
            this.x - this.radius * 0.3,
            this.y - this.radius * 0.3,
            this.radius * 0.5,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
    }
    
    // Check if this projectile can hit the given target
    canHit(target) {
        if (!target || !target.isActive) return false;
        
        // Don't hit the owner
        if (target === this.owner) return false;
        
        // Team damage logic (modify as needed)
        if (this.team !== 'neutral' && target.team === this.team) {
            return false;
        }
        
        return true;
    }
    
    // Check collision with a target
    checkCollision(target) {
        if (!this.canHit(target)) return false;
        
        // Simple circle collision for now
        const dx = target.components.position.x - this.x;
        const dy = target.components.position.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use target's collision radius if available, otherwise use a default
        const targetRadius = target.collisionRadius || 10;
        
        return distance < (this.radius + targetRadius);
    }
}
