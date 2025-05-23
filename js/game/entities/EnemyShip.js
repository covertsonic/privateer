import { Ship } from './Ship.js';
import { Weapon } from '../modules/Weapon.js';

export class EnemyShip extends Ship {
    // Ship class definitions based on EVE Online
    static MINMATAR_FRIGATES = [
        {
            type: 'Rifter',
            maxSpeed: 365, // m/s (base speed)
            acceleration: 180,
            rotationSpeed: 2.8,
            maxHealth: 450,
            shield: 400,
            armor: 650,
            color: '#f44336',
            description: 'A versatile combat frigate with balanced offense and defense'
        },
        {
            type: 'Breacher',
            maxSpeed: 385, // m/s
            acceleration: 190,
            rotationSpeed: 3.0,
            maxHealth: 400,
            shield: 450,
            armor: 550,
            color: '#ff7043',
            description: 'A missile-focused frigate with good mobility'
        },
        {
            type: 'Jaguar',
            maxSpeed: 405, // m/s
            acceleration: 210,
            rotationSpeed: 3.2,
            maxHealth: 550,
            shield: 500,
            armor: 750,
            color: '#d32f2f',
            description: 'An assault frigate with exceptional speed and power'
        },
        {
            type: 'Wolf',
            maxSpeed: 390, // m/s
            acceleration: 200,
            rotationSpeed: 3.0,
            maxHealth: 500,
            shield: 450,
            armor: 800,
            color: '#bf360c',
            description: 'An assault frigate with powerful close-range weapons'
        },
        {
            type: 'Probe',
            maxSpeed: 425, // m/s
            acceleration: 220,
            rotationSpeed: 3.5,
            maxHealth: 350,
            shield: 300,
            armor: 400,
            color: '#ff9e80',
            description: 'An exploration frigate with exceptional speed'
        }
    ];
    
    constructor(x, y, options = {}) {
        console.log('Creating EnemyShip instance at', x, y);
        
        // Select a random Minmatar frigate if no specific type is provided
        let shipType = options.shipType || null;
        if (!shipType) {
            const randomIndex = Math.floor(Math.random() * EnemyShip.MINMATAR_FRIGATES.length);
            shipType = EnemyShip.MINMATAR_FRIGATES[randomIndex];
            console.log('Selected random ship type:', shipType.type);
        }
        
        // Call Ship constructor with ship type properties
        super(x, y, {
            name: options.name || `${shipType.type}`,
            maxSpeed: options.maxSpeed || shipType.maxSpeed,
            acceleration: options.acceleration || shipType.acceleration,
            rotationSpeed: options.rotationSpeed || shipType.rotationSpeed,
            maxHealth: options.maxHealth || shipType.maxHealth,
            shield: options.shield || shipType.shield,
            armor: options.armor || shipType.armor,
            color: options.color || shipType.color,
            orbitDistance: options.orbitDistance || 200,
            orbitSpeed: options.orbitSpeed || 1
        });
        
        // Set team for targeting
        this.team = 'enemy';
        this.isActive = true;
        
        // Ensure unique ID
        this.id = 'enemy-' + Math.random().toString(36).substr(2, 9);
        console.log('Created enemy ship with ID:', this.id);
        
        // Ensure all required components exist
        if (!this.components) {
            console.error('Components object missing in EnemyShip constructor');
            this.components = {};
        }
        
        // Add ship component with name
        this.components.ship = {
            name: options.name || shipType.type || 'Enemy Ship',
            type: shipType.type || 'Generic Enemy',
            team: 'enemy'
        };
        
        // Make sure position is set
        if (!this.components.position) {
            this.components.position = { x: x, y: y };
        } else {
            this.components.position.x = x;
            this.components.position.y = y;
        }
        
        // Set initial velocity if provided
        if (options.initialVelocity) {
            this.components.velocity = {
                x: options.initialVelocity.x,
                y: options.initialVelocity.y,
                maxSpeed: this.components.velocity?.maxSpeed || 350
            };
            console.log('Setting initial velocity:', this.components.velocity);
        } else if (!this.components.velocity) {
            // Ensure velocity exists with default values
            this.components.velocity = { x: 0, y: 0, maxSpeed: 350 };
        }
        
        // Ensure rotation exists
        if (!this.components.rotation) {
            this.components.rotation = { angle: 0 };
        }
        
        // Ensure health exists
        if (!this.components.health) {
            this.components.health = { 
                current: options.maxHealth || 100, 
                max: options.maxHealth || 100 
            };
        }
        
        // Ensure shield exists
        if (!this.components.shield) {
            this.components.shield = { 
                current: options.shield || 50, 
                max: options.shield || 50 
            };
        }
        
        // Ensure armor exists
        if (!this.components.armor) {
            this.components.armor = { 
                current: options.armor || 30, 
                max: options.armor || 30 
            };
        }
        
        // Add hull component if it doesn't exist
        if (!this.components.hull) {
            this.components.hull = { 
                current: options.maxHealth || 100, 
                max: options.maxHealth || 100 
            };
        }
        
        // AI behavior properties
        this.state = 'idle'; // idle, attacking, fleeing
        this.detectionRange = 400;
        this.attackRange = 300;
        this.fleeThreshold = 0.3; // Flee when health is below 30%
        this.lastStateChange = 0;
        this.stateCooldown = 2; // seconds
        this.target = null;
        this.lastShotTime = 0;
        this.shotDelay = 2; // seconds between shots
    }
    
    initializeModules() {
        // Add a basic weapon
        const weapon = new Weapon(this, {
            damage: 8,
            fireRate: 0.8, // shots per second
            range: this.attackRange,
            projectileSpeed: 400,
            energyCost: 3,
            color: '#ff9999',
            name: 'Light Laser'
        });
        
        this.weapons.push(weapon);
    }
    
    update(deltaTime, playerShip) {
        // Call parent update first
        super.update(deltaTime, {});
        
        // If no player ship is provided, do nothing
        if (!playerShip) return;
        
        // Update target to player ship
        this.target = playerShip;
        
        // Calculate distance to player
        const dx = playerShip.components.position.x - this.components.position.x;
        const dy = playerShip.components.position.y - this.components.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update AI state
        this.updateAIState(distance, playerShip);
        
        // Execute behavior based on current state
        switch (this.state) {
            case 'attacking':
                this.updateAttacking(deltaTime, distance, dx, dy);
                break;
            case 'fleeing':
                this.updateFleeing(deltaTime, dx, dy);
                break;
            case 'idle':
            default:
                this.updateIdle(deltaTime);
                break;
        }
    }
    
    updateAIState(distance, playerShip) {
        const currentTime = Date.now() / 1000; // Convert to seconds
        const healthPercent = this.components.health.current / this.components.health.max;
        
        // Don't change state too often
        if (currentTime - this.lastStateChange < this.stateCooldown) {
            return;
        }
        
        // Check if we should flee
        if (healthPercent < this.fleeThreshold && this.state !== 'fleeing') {
            this.setState('fleeing');
            return;
        }
        
        // Check if we should attack
        if (distance < this.detectionRange && this.state !== 'attacking' && this.state !== 'fleeing') {
            this.setState('attacking');
            return;
        }
        
        // Return to idle if player is too far away
        if (distance > this.detectionRange * 1.5 && this.state !== 'idle') {
            this.setState('idle');
            return;
        }
    }
    
    updateAttacking(deltaTime, distance, dx, dy) {
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Calculate angle to player
        let targetAngle = Math.atan2(-dy, dx);
        
        // Normalize angles for comparison
        let angleDiff = targetAngle - (rotation.angle - Math.PI/2);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Rotate towards player
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                rotation.angle += velocity.rotationSpeed * deltaTime;
            } else {
                rotation.angle -= velocity.rotationSpeed * deltaTime;
            }
        }
        
        // Move towards or away to maintain orbit distance
        // Use 5000 meters as default orbit distance (EVE Online style)
        const orbitDistance = this.orbitDistance || 5000;
        const orbitBuffer = 500; // Buffer zone of 500m
        
        console.log(`Ship ${this.id} at distance ${distance.toFixed(0)}m from player, target orbit: ${orbitDistance}m`);
        
        if (distance > orbitDistance + orbitBuffer) {
            // Too far - move towards player
            console.log(`Ship ${this.id} moving toward player to reach orbit distance`);
            const angle = rotation.angle;
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime;
        } else if (distance < orbitDistance - orbitBuffer) {
            // Too close - move away from player
            console.log(`Ship ${this.id} moving away from player to maintain safe distance`);
            const angle = rotation.angle + Math.PI; // Reverse direction
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 0.8;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 0.8;
        } else {
            // In the sweet spot - orbit the player with tangential velocity
            console.log(`Ship ${this.id} orbiting player at ${distance.toFixed(0)}m`);
            
            // Calculate perpendicular vector for orbital motion
            const perpX = -dy / distance; // Perpendicular to the radial vector
            const perpY = dx / distance;
            
            // Apply tangential thrust for orbit
            const orbitSpeed = (this.orbitSpeed || 1) * velocity.maxSpeed * 0.5;
            velocity.x += perpX * orbitSpeed * deltaTime;
            velocity.y += perpY * orbitSpeed * deltaTime;
        }
        
        // Shoot at player if facing them
        if (Math.abs(angleDiff) < 0.5 && distance < this.attackRange) {
            this.tryShoot();
        }
    }
    
    updateFleeing(deltaTime, dx, dy) {
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Calculate angle away from player
        let targetAngle = Math.atan2(dy, -dx);
        
        // Normalize angles for comparison
        let angleDiff = targetAngle - (rotation.angle - Math.PI/2);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Rotate away from player
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                rotation.angle += velocity.rotationSpeed * deltaTime * 1.5; // Faster rotation when fleeing
            } else {
                rotation.angle -= velocity.rotationSpeed * deltaTime * 1.5;
            }
        }
        
        // Apply full thrust away from player
        const angle = rotation.angle;
        velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 1.2; // Faster when fleeing
        velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 1.2;
    }
    
    updateIdle(deltaTime) {
        // Simple wandering behavior
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Occasionally change direction
        if (Math.random() < 0.01) {
            rotation.angle += (Math.random() - 0.5) * 2;
        }
        
        // Apply small amount of thrust
        if (Math.random() < 0.1) {
            const angle = rotation.angle;
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime * 0.3;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime * 0.3;
        }
        
        // Limit speed when idling
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed > velocity.maxSpeed * 0.3) {
            velocity.x = (velocity.x / speed) * (velocity.maxSpeed * 0.3);
            velocity.y = (velocity.y / speed) * (velocity.maxSpeed * 0.3);
        }
    }
    
    tryShoot() {
        const currentTime = Date.now() / 1000; // Convert to seconds
        if (currentTime - this.lastShotTime > this.shotDelay && this.target) {
            this.attack(this.target);
            this.lastShotTime = currentTime;
        }
    }
    
    /**
     * Makes the ship orbit a target at a specific distance
     * @param {Object} target - The target to orbit
     * @param {number} distance - The desired orbit distance in meters
     * @param {number} speed - The orbit speed factor (1 = normal speed)
     */
    orbitTarget(target, desiredDistance, speed) {
        if (!target || !target.components || !target.components.position) {
            console.warn('Cannot orbit: invalid target');
            return;
        }
        
        // Get positions
        const targetPos = target.components.position;
        const myPos = this.components.position;
        const velocity = this.components.velocity;
        
        // Calculate vector from target to ship
        const dx = myPos.x - targetPos.x;
        const dy = myPos.y - targetPos.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (currentDistance < 1) {
            // Too close! Move away in a random direction
            const randomAngle = Math.random() * Math.PI * 2;
            velocity.x = Math.cos(randomAngle) * velocity.maxSpeed * 0.5;
            velocity.y = Math.sin(randomAngle) * velocity.maxSpeed * 0.5;
            return;
        }
        
        // Convert desired distance from meters to pixels (using the scale factor from PhysicsSystem)
        const scaleFactor = 0.01;
        const desiredPixelDistance = desiredDistance * scaleFactor;
        
        // First component: if we're not at the right distance, move towards/away
        let radialFactor = 0;
        const distanceDifference = desiredPixelDistance - currentDistance;
        const distanceThreshold = desiredPixelDistance * 0.1; // 10% threshold
        
        if (Math.abs(distanceDifference) > distanceThreshold) {
            // Need to adjust distance
            radialFactor = distanceDifference > 0 ? 0.5 : -0.5; // Move towards or away
        }
        
        // Calculate normalized direction vectors
        const normalizedRadialX = dx / currentDistance; // Towards ship from target
        const normalizedRadialY = dy / currentDistance;
        
        // Tangential component (perpendicular to radial for orbit)
        const normalizedTangentialX = -normalizedRadialY;
        const normalizedTangentialY = normalizedRadialX;
        
        // Calculate target velocity components
        const radialComponent = radialFactor * velocity.maxSpeed * 0.5;
        const tangentialComponent = speed * velocity.maxSpeed * 0.5;
        
        // Calculate final velocity
        const targetVelocityX = normalizedRadialX * radialComponent + normalizedTangentialX * tangentialComponent;
        const targetVelocityY = normalizedRadialY * radialComponent + normalizedTangentialY * tangentialComponent;
        
        // Apply with gradual transition
        const transitionRate = 0.1; // Faster transition
        velocity.x = velocity.x * (1 - transitionRate) + targetVelocityX * transitionRate;
        velocity.y = velocity.y * (1 - transitionRate) + targetVelocityY * transitionRate;
        
        // Make ship face direction of travel
        if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
            const velocityAngle = Math.atan2(velocity.y, velocity.x);
            this.components.rotation.angle = velocityAngle + Math.PI/2;
        }
        
        // Debug info
        console.log(`Ship ${this.id} orbital info:`);
        console.log(`- Current distance: ${(currentDistance / scaleFactor).toFixed(0)}m, Desired: ${desiredDistance}m`);
        console.log(`- Radial factor: ${radialFactor.toFixed(2)}, Distance difference: ${(distanceDifference / scaleFactor).toFixed(0)}m`);
        console.log(`- Velocity: (${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)})`);
        console.log(`- Position: (${myPos.x.toFixed(1)}, ${myPos.y.toFixed(1)})`);
        console.log(`- Target position: (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)})`);
        console.log('---');
    }
    
    setState(newState) {
        if (this.state === newState) return;
        
        this.state = newState;
        this.lastStateChange = Date.now() / 1000; // Convert to seconds
        
        // Handle state exit/enter logic
        switch (newState) {
            case 'attacking':
                console.log(`${this.name} is now attacking`);
                break;
            case 'fleeing':
                console.log(`${this.name} is now fleeing`);
                break;
            case 'idle':
                console.log(`${this.name} is now idle`);
                break;
        }
    }
    
    destroy() {
        console.log(`${this.name} has been destroyed!`);
        // TODO: Add explosion effect
        
        // Remove from game
        if (this.game) {
            this.game.entityManager.removeEntity(this);
            
            // Notify game that an enemy was destroyed
            if (this.game.onEnemyDestroyed) {
                this.game.onEnemyDestroyed(this);
            }
        }
    }
}
