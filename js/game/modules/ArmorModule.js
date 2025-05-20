export class ArmorModule {
    constructor(ship, options = {}) {
        this.ship = ship;
        this.game = ship.game;
        
        // Armor properties
        this.maxArmor = options.maxArmor || 150;
        this.armorRepairRate = options.armorRepairRate || 5; // per second
        this.armorRepairCost = options.armorRepairCost || 10; // energy per point
        this.damageReduction = options.damageReduction || 0.4; // 40% damage reduction
        this.explosionResistance = options.explosionResistance || 0.3; // 30% less damage from explosions
        
        // Armor state
        this.currentArmor = this.maxArmor;
        this.isRepairing = false;
        this.lastDamageTime = 0;
        this.repairCooldown = 3; // seconds before repair can start after damage
        this.name = options.name || 'Reinforced Armor';
        this.color = options.color || '#888888';
        
        // Visual effects
        this.damageParticles = [];
        this.maxDamageParticles = 20;
    }
    
    update(deltaTime) {
        // Update damage particles
        this.updateDamageParticles(deltaTime);
        
        // Handle automatic armor repair
        if (this.isRepairing && this.currentArmor < this.maxArmor) {
            this.repairArmor(deltaTime);
        }
    }
    
    takeDamage(amount, damageType = 'kinetic') {
        // Update last damage time for repair cooldown
        this.lastDamageTime = Date.now() / 1000;
        
        // Apply damage type resistance
        let finalDamage = amount;
        if (damageType === 'explosive') {
            finalDamage *= (1 - this.explosionResistance);
        }
        
        // Apply armor damage reduction
        finalDamage = this.applyArmorReduction(finalDamage);
        
        // Generate damage particles
        this.createDamageParticles(amount, damageType);
        
        return finalDamage;
    }
    
    applyArmorReduction(damage) {
        // Calculate damage reduction based on current armor
        const armorFactor = this.currentArmor / this.maxArmor; // 0 to 1
        const reduction = this.damageReduction * armorFactor;
        
        // Apply reduction
        const reducedDamage = damage * (1 - reduction);
        
        // Damage the armor itself
        const armorDamage = damage * 0.3; // Armor takes 30% of the damage
        this.currentArmor = Math.max(0, this.currentArmor - armorDamage);
        
        // If armor is completely destroyed, return full damage
        if (this.currentArmor <= 0) {
            this.currentArmor = 0;
            return damage;
        }
        
        return reducedDamage;
    }
    
    startRepairing() {
        const currentTime = Date.now() / 1000;
        const timeSinceDamage = currentTime - this.lastDamageTime;
        
        // Check if we can start repairing (cooldown after damage)
        if (timeSinceDamage >= this.repairCooldown && this.currentArmor < this.maxArmor) {
            this.isRepairing = true;
            return true;
        }
        return false;
    }
    
    stopRepairing() {
        this.isRepairing = false;
    }
    
    repairArmor(deltaTime) {
        if (this.currentArmor >= this.maxArmor) {
            this.currentArmor = this.maxArmor;
            this.isRepairing = false;
            return;
        }
        
        // Calculate repair amount based on repair rate and energy available
        const energyAvailable = this.ship.components.energy.current;
        const maxRepair = this.armorRepairRate * deltaTime;
        const energyNeeded = maxRepair * this.armorRepairCost;
        
        if (energyAvailable >= energyNeeded) {
            // Enough energy for full repair
            this.currentArmor = Math.min(this.maxArmor, this.currentArmor + maxRepair);
            this.ship.components.energy.current -= energyNeeded;
        } else if (energyAvailable > 0) {
            // Partial repair with available energy
            const possibleRepair = energyAvailable / this.armorRepairCost;
            this.currentArmor = Math.min(this.maxArmor, this.currentArmor + possibleRepair);
            this.ship.components.energy.current = 0;
        } else {
            // Not enough energy to repair
            this.isRepairing = false;
        }
    }
    
    createDamageParticles(amount, damageType) {
        // Create visual particles when armor is hit
        const count = Math.min(Math.ceil(amount / 5), this.maxDamageParticles);
        const position = this.ship.components.position;
        const velocity = this.ship.components.velocity;
        
        // Determine particle color based on damage type
        let color;
        switch(damageType) {
            case 'explosive':
                color = '#ff7700';
                break;
            case 'energy':
                color = '#00aaff';
                break;
            case 'kinetic':
            default:
                color = '#cccccc';
                break;
        }
        
        for (let i = 0; i < count; i++) {
            // Add some randomness to position
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 15;
            const x = position.x + Math.cos(angle) * distance;
            const y = position.y + Math.sin(angle) * distance;
            
            // Random velocity away from impact
            const speed = 30 + Math.random() * 70;
            const vx = Math.cos(angle) * speed + (velocity?.x || 0) * 0.5;
            const vy = Math.sin(angle) * speed + (velocity?.y || 0) * 0.5;
            
            this.damageParticles.push({
                x,
                y,
                vx,
                vy,
                life: 0.5 + Math.random() * 1.0,
                maxLife: 1.5,
                size: 1 + Math.random() * 3,
                color
            });
        }
        
        // Limit number of particles
        if (this.damageParticles.length > this.maxDamageParticles * 3) {
            this.damageParticles = this.damageParticles.slice(-this.maxDamageParticles);
        }
    }
    
    updateDamageParticles(deltaTime) {
        // Update and filter out dead particles
        this.damageParticles = this.damageParticles.filter(particle => {
            particle.life -= deltaTime;
            if (particle.life <= 0) return false;
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Apply friction
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            return true;
        });
    }
    
    draw(ctx) {
        // Draw damage particles
        this.damageParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    // Get armor status (0 to 1)
    getArmorStatus() {
        return this.currentArmor / this.maxArmor;
    }
    
    // Get current armor value
    getCurrentArmor() {
        return this.currentArmor;
    }
    
    // Get maximum armor value
    getMaxArmor() {
        return this.maxArmor;
    }
    
    // Repair armor by a certain amount (bypasses energy cost, used for power-ups)
    repair(amount) {
        this.currentArmor = Math.min(this.maxArmor, this.currentArmor + amount);
    }
    
    // Completely restore armor (bypasses energy cost)
    restore() {
        this.currentArmor = this.maxArmor;
    }
}
