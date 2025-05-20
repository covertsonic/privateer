export class ShieldModule {
    constructor(ship, options = {}) {
        this.ship = ship;
        this.game = ship.game;
        
        // Shield properties
        this.maxShield = options.maxShield || 100;
        this.shieldRechargeRate = options.shieldRechargeRate || 10; // per second
        this.shieldRechargeDelay = options.shieldRechargeDelay || 5; // seconds
        this.activationCost = options.activationCost || 20; // energy to activate
        this.activeCost = options.activeCost || 15; // energy per second when active
        this.damageAbsorption = options.damageAbsorption || 0.7; // 70% damage absorbed
        
        // Shield state
        this.currentShield = this.maxShield;
        this.isActive = false;
        this.lastDamageTime = 0;
        this.lastEnergyDrainTime = 0;
        this.name = options.name || 'Shield Generator';
        this.color = options.color || '#55aaff';
        
        // Visual effects
        this.shieldRadius = options.shieldRadius || 40; // Visual radius when active
        this.shieldOpacity = 0.3;
        this.shieldPulse = 0;
    }
    
    update(deltaTime) {
        // Update shield pulsing effect
        this.shieldPulse = (this.shieldPulse + deltaTime * 2) % (Math.PI * 2);
        
        // Handle active shield energy drain
        if (this.isActive) {
            const currentTime = Date.now() / 1000; // Convert to seconds
            const timeSinceLastDrain = currentTime - this.lastEnergyDrainTime;
            
            // Drain energy over time
            if (timeSinceLastDrain >= 1.0) {
                const energyDrain = this.activeCost * timeSinceLastDrain;
                
                if (this.ship.components.energy.current >= energyDrain) {
                    this.ship.components.energy.current -= energyDrain;
                    this.lastEnergyDrainTime = currentTime;
                } else {
                    // Not enough energy to maintain shield
                    this.deactivate();
                }
            }
        }
        
        // Handle shield recharge when not taking damage
        if (!this.isActive && this.currentShield < this.maxShield) {
            const currentTime = Date.now() / 1000;
            const timeSinceDamage = currentTime - this.lastDamageTime;
            
            if (timeSinceDamage >= this.shieldRechargeDelay) {
                this.rechargeShield(deltaTime);
            }
        }
    }
    
    activate() {
        // Check if we can activate (enough energy and shield isn't broken)
        if (this.ship.components.energy.current >= this.activationCost && this.currentShield > 0) {
            this.isActive = true;
            this.lastEnergyDrainTime = Date.now() / 1000;
            this.ship.components.energy.current -= this.activationCost;
            console.log(`${this.ship.name}'s ${this.name} activated`);
            return true;
        }
        return false;
    }
    
    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            console.log(`${this.ship.name}'s ${this.name} deactivated`);
        }
    }
    
    takeDamage(amount) {
        // Update last damage time for recharge delay
        this.lastDamageTime = Date.now() / 1000;
        
        // If shields are active, absorb damage
        if (this.isActive) {
            const damageToShield = amount * this.damageAbsorption;
            const damageToHull = amount - damageToShield;
            
            // Apply damage to shield
            this.currentShield = Math.max(0, this.currentShield - damageToShield);
            
            // If shield is depleted, deactivate it
            if (this.currentShield <= 0) {
                this.currentShield = 0;
                this.deactivate();
            }
            
            // Return remaining damage to be applied to hull
            return damageToHull;
        }
        
        // If shields are not active, all damage goes to hull
        return amount;
    }
    
    rechargeShield(deltaTime) {
        const rechargeAmount = this.shieldRechargeRate * deltaTime;
        this.currentShield = Math.min(this.maxShield, this.currentShield + rechargeAmount);
    }
    
    // Draw shield effect around the ship
    draw(ctx) {
        if (this.isActive && this.currentShield > 0) {
            const position = this.ship.components.position;
            const rotation = this.ship.components.rotation;
            
            // Calculate shield pulse effect
            const pulse = Math.sin(this.shieldPulse) * 0.1 + 0.9; // 0.8 to 1.0
            const radius = this.shieldRadius * pulse;
            
            // Draw shield circle
            ctx.save();
            ctx.translate(position.x, position.y);
            ctx.rotate(-rotation.angle);
            
            // Outer glow
            const gradient = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius);
            gradient.addColorStop(0, `${this.color}40`);
            gradient.addColorStop(1, `${this.color}00`);
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Shield outline
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `${this.color}${Math.floor(this.shieldOpacity * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Shield strength indicator (segments)
            const segments = 8;
            const segmentAngle = (Math.PI * 2) / segments;
            const segmentLength = 5;
            
            for (let i = 0; i < segments; i++) {
                const angle = i * segmentAngle;
                const startX = Math.cos(angle) * (radius - 2);
                const startY = Math.sin(angle) * (radius - 2);
                const endX = Math.cos(angle) * (radius + segmentLength);
                const endY = Math.sin(angle) * (radius + segmentLength);
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
    
    // Get shield status (0 to 1)
    getShieldStatus() {
        return this.currentShield / this.maxShield;
    }
    
    // Get current shield value
    getCurrentShield() {
        return this.currentShield;
    }
    
    // Get maximum shield value
    getMaxShield() {
        return this.maxShield;
    }
    
    // Repair shield by a certain amount
    repair(amount) {
        this.currentShield = Math.min(this.maxShield, this.currentShield + amount);
    }
    
    // Completely restore shields
    restore() {
        this.currentShield = this.maxShield;
    }
}
