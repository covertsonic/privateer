export class PropulsionModule {
    constructor(ship, options = {}) {
        this.ship = ship;
        this.game = ship.game;
        
        // Movement properties
        this.baseThrust = options.baseThrust || 100;
        this.baseTurnRate = options.baseTurnRate || 2.5; // radians per second
        this.baseMaxSpeed = options.baseMaxSpeed || 200;
        this.baseAcceleration = options.baseAcceleration || 100;
        this.baseDeceleration = options.baseDeceleration || 50;
        
        // Energy usage
        this.thrustEnergyCost = options.thrustEnergyCost || 5; // per second
        this.turnEnergyCost = options.turnEnergyCost || 3; // per second
        this.boostEnergyCost = options.boostEnergyCost || 20; // per second
        
        // Boost properties
        this.boostMultiplier = options.boostMultiplier || 1.8;
        this.boostDuration = options.boostDuration || 3; // seconds
        this.boostCooldown = options.boostCooldown || 5; // seconds
        this.boostRecoveryRate = options.boostRecoveryRate || 0.5; // per second
        
        // State
        this.isBoosting = false;
        this.boostMeter = 1.0; // 0 to 1
        this.boostCooldownTimer = 0;
        this.boostActiveTime = 0;
        this.currentThrust = 0;
        this.currentTurn = 0;
        this.name = options.name || 'Standard Propulsion';
        this.color = options.color || '#00ffaa';
        
        // Visual effects
        this.thrusterParticles = [];
        this.maxThrusterParticles = 30;
        this.thrusterIntensity = 0;
        this.boostVisualEffect = 0;
    }
    
    update(deltaTime, input = {}) {
        // Update timers
        this.updateBoost(deltaTime);
        
        // Update thruster effects
        this.updateThrusterEffects(deltaTime, input);
        
        // Apply movement based on input
        this.applyMovement(deltaTime, input);
    }
    
    updateBoost(deltaTime) {
        // Handle boost cooldown
        if (this.boostCooldownTimer > 0) {
            this.boostCooldownTimer = Math.max(0, this.boostCooldownTimer - deltaTime);
        }
        
        // Handle active boost
        if (this.isBoosting) {
            this.boostActiveTime += deltaTime;
            
            // Check if boost should end
            if (this.boostActiveTime >= this.boostDuration || 
                this.ship.components.energy.current <= 0) {
                this.endBoost();
            } else {
                // Consume energy for boost
                const energyCost = this.boostEnergyCost * deltaTime;
                if (this.ship.components.energy.current >= energyCost) {
                    this.ship.components.energy.current -= energyCost;
                } else {
                    this.endBoost();
                }
            }
        } 
        // Recharge boost meter when not in cooldown
        else if (this.boostCooldownTimer <= 0 && this.boostMeter < 1.0) {
            this.boostMeter = Math.min(1.0, this.boostMeter + this.boostRecoveryRate * deltaTime);
        }
        
        // Update boost visual effect
        if (this.isBoosting) {
            this.boostVisualEffect = 1.0;
        } else {
            this.boostVisualEffect = Math.max(0, this.boostVisualEffect - deltaTime * 2);
        }
    }
    
    updateThrusterEffects(deltaTime, input) {
        // Update thruster intensity based on input
        const targetIntensity = (Math.abs(input.forward) > 0.1 || Math.abs(input.turn) > 0.1) ? 1.0 : 0.0;
        this.thrusterIntensity += (targetIntensity - this.thrusterIntensity) * deltaTime * 5;
        
        // Update existing particles
        this.thrusterParticles = this.thrusterParticles.filter(particle => {
            particle.life -= deltaTime;
            if (particle.life <= 0) return false;
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Apply drag
            particle.vx *= 0.9;
            particle.vy *= 0.9;
            
            return true;
        });
        
        // Add new particles when thrusting
        if (this.thrusterIntensity > 0.1 && this.thrusterParticles.length < this.maxThrusterParticles) {
            this.addThrusterParticles(deltaTime, input);
        }
    }
    
    addThrusterParticles(deltaTime, input) {
        const position = this.ship.components.position;
        const rotation = this.ship.components.rotation;
        const velocity = this.ship.components.velocity;
        
        // Calculate thruster positions (back of ship)
        const shipAngle = rotation.angle + Math.PI / 2; // Convert to standard angle
        const shipDirX = Math.cos(shipAngle);
        const shipDirY = -Math.sin(shipAngle);
        
        // Add more particles when boosting
        const particleCount = this.isBoosting ? 3 : 1;
        
        for (let i = 0; i < particleCount; i++) {
            // Random offset at the back of the ship
            const offsetX = (Math.random() - 0.5) * 10;
            const offsetY = (Math.random() - 0.5) * 10;
            
            const particle = {
                x: position.x - shipDirX * 20 + offsetX,
                y: position.y - shipDirY * 20 + offsetY,
                vx: -shipDirX * (100 + Math.random() * 100) * this.thrusterIntensity,
                vy: -shipDirY * (100 + Math.random() * 100) * this.thrusterIntensity,
                life: 0.2 + Math.random() * 0.3,
                maxLife: 0.5,
                size: 2 + Math.random() * 4,
                color: this.isBoosting ? '#ffaa00' : '#ff5500'
            };
            
            // Add ship velocity to particles
            particle.vx += velocity.x * 0.5;
            particle.vy += velocity.y * 0.5;
            
            this.thrusterParticles.push(particle);
        }
    }
    
    applyMovement(deltaTime, input) {
        const velocity = this.ship.components.velocity;
        const rotation = this.ship.components.rotation;
        
        // Calculate movement modifiers
        const boostMultiplier = this.isBoosting ? this.boostMultiplier : 1.0;
        const currentMaxSpeed = this.baseMaxSpeed * boostMultiplier;
        const currentAcceleration = this.baseAcceleration * boostMultiplier;
        
        // Handle rotation
        if (Math.abs(input.turn) > 0.1) {
            const turnAmount = input.turn * this.baseTurnRate * deltaTime;
            
            // Consume energy for turning
            const turnEnergyCost = Math.abs(turnAmount) * this.turnEnergyCost * deltaTime;
            if (this.ship.components.energy.current >= turnEnergyCost) {
                rotation.angle += turnAmount;
                this.ship.components.energy.current -= turnEnergyCost;
                this.currentTurn = input.turn;
            } else {
                this.currentTurn = 0;
            }
        } else {
            this.currentTurn = 0;
        }
        
        // Handle thrust
        if (Math.abs(input.forward) > 0.1) {
            const angle = rotation.angle + Math.PI / 2; // Convert to standard angle
            const thrustX = Math.cos(angle) * currentAcceleration * deltaTime * input.forward;
            const thrustY = -Math.sin(angle) * currentAcceleration * deltaTime * input.forward;
            
            // Consume energy for thrust
            const thrustEnergyCost = Math.abs(input.forward) * this.thrustEnergyCost * deltaTime;
            if (this.ship.components.energy.current >= thrustEnergyCost) {
                velocity.x += thrustX;
                velocity.y += thrustY;
                this.ship.components.energy.current -= thrustEnergyCost;
                this.currentThrust = input.forward;
            } else {
                this.currentThrust = 0;
            }
        } else {
            this.currentThrust = 0;
            
            // Apply deceleration when not thrusting
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            if (speed > 0) {
                const decelAmount = this.baseDeceleration * deltaTime;
                const factor = Math.max(0, speed - decelAmount) / speed;
                velocity.x *= factor;
                velocity.y *= factor;
            }
        }
        
        // Limit speed
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed > currentMaxSpeed) {
            velocity.x = (velocity.x / speed) * currentMaxSpeed;
            velocity.y = (velocity.y / speed) * currentMaxSpeed;
        }
    }
    
    startBoost() {
        if (!this.isBoosting && this.boostCooldownTimer <= 0 && this.boostMeter >= 0.2) {
            this.isBoosting = true;
            this.boostActiveTime = 0;
            this.boostMeter = Math.max(0, this.boostMeter - 0.2); // Use 20% of boost meter
            return true;
        }
        return false;
    }
    
    endBoost() {
        if (this.isBoosting) {
            this.isBoosting = false;
            this.boostCooldownTimer = this.boostCooldown;
            this.boostActiveTime = 0;
        }
    }
    
    draw(ctx) {
        // Draw thruster particles
        this.thrusterParticles.forEach(particle => {
            const alpha = (particle.life / particle.maxLife) * 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Draw particle with glow effect
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 1.5
            );
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw bright center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        // Draw boost effect
        if (this.boostVisualEffect > 0) {
            const position = this.ship.components.position;
            const rotation = this.ship.components.rotation;
            const angle = rotation.angle + Math.PI / 2;
            
            // Boost trail
            ctx.save();
            ctx.translate(position.x, position.y);
            ctx.rotate(-angle);
            
            const gradient = ctx.createLinearGradient(0, 0, 0, -50);
            gradient.addColorStop(0, `rgba(255, 200, 100, ${0.3 * this.boostVisualEffect})`);
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-25, -40, 50, -40);
            
            // Boost glow
            const glowGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 40);
            glowGradient.addColorStop(0, `rgba(255, 200, 100, ${0.5 * this.boostVisualEffect})`);
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    // Get boost status (0 to 1)
    getBoostStatus() {
        return this.boostMeter;
    }
    
    // Check if boost is ready
    isBoostReady() {
        return this.boostCooldownTimer <= 0 && this.boostMeter >= 0.2;
    }
    
    // Get current speed ratio (0 to 1)
    getSpeedRatio() {
        const velocity = this.ship.components.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const maxSpeed = this.baseMaxSpeed * (this.isBoosting ? this.boostMultiplier : 1.0);
        return Math.min(1.0, speed / maxSpeed);
    }
}
