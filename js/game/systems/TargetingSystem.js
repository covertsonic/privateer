export class TargetingSystem {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.potentialTargets = [];
        this.lockingTarget = null;
        this.lockStartTime = 0;
        this.lockDuration = 1500; // ms to complete lock
        this.maxTargetRange = 1500; // max distance for targeting
        
        // UI Elements
        this.targetListContainer = document.getElementById('targets-container');
        this.targetInfoName = document.getElementById('target-name');
        this.targetInfoDistance = document.getElementById('target-distance');
        this.targetInfoVelocity = document.getElementById('target-velocity');
        this.targetInfoAngularVelocity = document.getElementById('target-angular-velocity');
        
        // Setup event listeners for targeting
        this.setupEventListeners();
    }
    
    setPlayer(player) {
        this.player = player;
    }
    
    setupEventListeners() {
        // We'll attach event listeners to target entries when they're created
    }
    
    update(deltaTime, entityManager) {
        if (!this.player) return;
        
        // Get all possible targets (ships that aren't the player)
        this.updatePotentialTargets(entityManager);
        
        // Update target list UI
        this.updateTargetList();
        
        // Handle target locking process
        this.updateTargetLocking();
        
        // Update target info panel if we have an active target
        if (this.player.target) {
            this.updateTargetInfo();
        }
    }
    
    updatePotentialTargets(entityManager) {
        // Get all ship entities except the player
        const ships = entityManager.getEntitiesWithComponents('position', 'ship');
        this.potentialTargets = ships.filter(ship => ship !== this.player);
        
        // Sort targets by distance to player
        if (this.player && this.player.components.position) {
            const playerPos = this.player.components.position;
            
            this.potentialTargets.sort((a, b) => {
                const distA = this.calculateDistance(playerPos, a.components.position);
                const distB = this.calculateDistance(playerPos, b.components.position);
                return distA - distB;
            });
        }
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    calculateAngularVelocity(ship1, ship2) {
        // Simplified angular velocity calculation
        // In a real implementation, this would use actual velocity vectors and positions
        if (!ship1.components.velocity || !ship2.components.velocity) {
            return 0;
        }
        
        const v1 = ship1.components.velocity;
        const v2 = ship2.components.velocity;
        const relVelocityX = v2.x - v1.x;
        const relVelocityY = v2.y - v1.y;
        
        const p1 = ship1.components.position;
        const p2 = ship2.components.position;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return 0; // Avoid division by zero
        
        // Project relative velocity onto the normal to the position vector
        // This gives transverse velocity
        const transverseVelocity = Math.abs(relVelocityX * (-dy/distance) + relVelocityY * (dx/distance));
        
        // Angular velocity = transverse velocity / distance (radians/s)
        return transverseVelocity / distance;
    }
    
    startTargetLock(target) {
        // If we're already locking this target, do nothing
        if (this.lockingTarget === target) return;
        
        // If we have a current target, unlock it
        if (this.player.target) {
            this.unlockTarget();
        }
        
        // Start locking process
        this.lockingTarget = target;
        this.lockStartTime = Date.now();
        
        // Update UI to show locking status
        this.updateTargetList();
    }
    
    updateTargetLocking() {
        if (!this.lockingTarget) return;
        
        const now = Date.now();
        const elapsed = now - this.lockStartTime;
        
        // Check if lock is complete
        if (elapsed >= this.lockDuration) {
            this.completeTargetLock();
        }
    }
    
    completeTargetLock() {
        if (!this.lockingTarget) return;
        
        // Set the locked target as the player's target
        this.player.target = this.lockingTarget;
        
        // Reset locking state
        this.lockingTarget = null;
        this.lockStartTime = 0;
        
        // Update UI
        this.updateTargetList();
        this.updateTargetInfo();
    }
    
    unlockTarget() {
        this.player.target = null;
        this.lockingTarget = null;
        this.lockStartTime = 0;
        
        // Clear target info
        this.targetInfoName.textContent = 'No Target';
        this.targetInfoDistance.textContent = '-';
        this.targetInfoVelocity.textContent = '-';
        this.targetInfoAngularVelocity.textContent = '-';
        
        // Update UI
        this.updateTargetList();
    }
    
    updateTargetList() {
        // Clear existing entries
        this.targetListContainer.innerHTML = '';
        
        // If no targets, show message and return
        if (this.potentialTargets.length === 0) {
            const noTargetsMsg = document.createElement('div');
            noTargetsMsg.className = 'no-targets-message';
            noTargetsMsg.textContent = 'No targets in range';
            this.targetListContainer.appendChild(noTargetsMsg);
            return;
        }
        
        // Create target entries
        this.potentialTargets.forEach(target => {
            if (!target.components.position) return; // Skip if no position
            
            // Calculate distance to player
            const distance = this.calculateDistance(
                this.player.components.position, 
                target.components.position
            );
            
            // Skip if out of range
            if (distance > this.maxTargetRange) return;
            
            // Create target entry
            const entry = this.createTargetEntry(target, distance);
            this.targetListContainer.appendChild(entry);
        });
    }
    
    createTargetEntry(target, distance) {
        const entry = document.createElement('div');
        entry.className = 'target-entry';
        
        // Add selected class if this is the current target
        if (this.player.target === target) {
            entry.classList.add('selected');
        }
        
        // Get shield, armor, hull values
        const shield = target.components.shield?.current || 0;
        const shieldMax = target.components.shield?.max || 1;
        const armor = target.components.armor?.current || 0;
        const armorMax = target.components.armor?.max || 1;
        const hull = target.components.hull?.current || 0;
        const hullMax = target.components.hull?.max || 1;
        
        // Capacitor is estimated/simulated
        const capacitor = target.components.capacitor?.current || 
                         Math.round(Math.random() * 100); // Simulated value
        const capacitorMax = target.components.capacitor?.max || 100;
        
        // Calculate angular velocity
        const angularVelocity = this.calculateAngularVelocity(this.player, target);
        
        // Format distance
        const formattedDistance = distance < 1000 
            ? `${Math.round(distance)}m` 
            : `${(distance / 1000).toFixed(1)}km`;
        
        // Header with name and distance
        const header = document.createElement('div');
        header.className = 'target-header';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'target-name';
        nameElement.textContent = target.components.ship?.name || 'Unknown Ship';
        
        const distanceElement = document.createElement('div');
        distanceElement.className = 'target-distance';
        distanceElement.textContent = formattedDistance;
        
        header.appendChild(nameElement);
        header.appendChild(distanceElement);
        
        // Status bars
        const stats = document.createElement('div');
        stats.className = 'target-stats';
        
        // Shield mini-bar
        const shieldStatus = this.createMiniStatusBar('S', shield, shieldMax, 'shield');
        
        // Armor mini-bar
        const armorStatus = this.createMiniStatusBar('A', armor, armorMax, 'armor');
        
        // Hull mini-bar
        const hullStatus = this.createMiniStatusBar('H', hull, hullMax, 'hull');
        
        stats.appendChild(shieldStatus);
        stats.appendChild(armorStatus);
        stats.appendChild(hullStatus);
        
        // Details (angular velocity and capacitor)
        const details = document.createElement('div');
        details.className = 'target-details';
        
        const avElement = document.createElement('div');
        avElement.textContent = `AV: ${angularVelocity.toFixed(2)} rad/s`;
        
        const capElement = document.createElement('div');
        capElement.textContent = `CAP: ${Math.round(capacitor / capacitorMax * 100)}%`;
        
        details.appendChild(avElement);
        details.appendChild(capElement);
        
        // Target button
        const targetButton = document.createElement('button');
        targetButton.className = 'target-button';
        targetButton.setAttribute('data-target-id', target.id);
        
        const crosshair = document.createElement('div');
        crosshair.className = 'target-crosshair';
        
        // Set crosshair state based on targeting status
        if (this.player.target === target) {
            crosshair.classList.add('locked');
        } else if (this.lockingTarget === target) {
            crosshair.classList.add('locking');
        }
        
        targetButton.appendChild(crosshair);
        
        // Add click handler to target button
        targetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startTargetLock(target);
        });
        
        // Assemble entry
        entry.appendChild(header);
        entry.appendChild(stats);
        entry.appendChild(details);
        entry.appendChild(targetButton);
        
        return entry;
    }
    
    createMiniStatusBar(label, current, max, type) {
        const container = document.createElement('div');
        container.className = 'mini-status';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'mini-label';
        labelElement.textContent = label;
        
        const bar = document.createElement('div');
        bar.className = 'mini-bar';
        
        // Create 4 segments
        const segments = 4;
        const filledSegments = Math.ceil((current / max) * segments);
        
        for (let i = 0; i < segments; i++) {
            const segment = document.createElement('div');
            segment.className = `mini-segment ${i < filledSegments ? 'filled' : 'empty'} ${type}`;
            bar.appendChild(segment);
        }
        
        container.appendChild(labelElement);
        container.appendChild(bar);
        
        return container;
    }
    
    updateTargetInfo() {
        if (!this.player.target) return;
        
        const target = this.player.target;
        
        // Update target info panel
        this.targetInfoName.textContent = target.components.ship?.name || 'Unknown Target';
        
        // Calculate distance
        const distance = this.calculateDistance(
            this.player.components.position, 
            target.components.position
        );
        
        // Format distance
        const formattedDistance = distance < 1000 
            ? `Distance: ${Math.round(distance)}m` 
            : `Distance: ${(distance / 1000).toFixed(1)}km`;
        
        this.targetInfoDistance.textContent = formattedDistance;
        
        // Calculate velocity
        const velocity = target.components.velocity 
            ? Math.sqrt(target.components.velocity.x ** 2 + target.components.velocity.y ** 2)
            : 0;
        
        this.targetInfoVelocity.textContent = `Velocity: ${Math.round(velocity)}m/s`;
        
        // Calculate angular velocity
        const angularVelocity = this.calculateAngularVelocity(this.player, target);
        this.targetInfoAngularVelocity.textContent = `Angular: ${angularVelocity.toFixed(2)} rad/s`;
    }
}
