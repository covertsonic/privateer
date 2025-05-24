export class TargetingSystem {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.potentialTargets = [];
        this.lockingTarget = null;
        this.lockStartTime = 0;
        this.lockDuration = 1500; // ms to complete lock
        this.maxTargetRange = 70000; // max distance for targeting in meters (70km)
        
        // Scale factor to convert pixel distances to meters
        // This must match the scale factor in PhysicsSystem (0.01)
        this.distanceScaleFactor = 100; // 1 pixel = 100 meters (inverse of 0.01)
        
        // UI Elements - safely get elements that might not exist
        try {
            this.targetListContainer = document.getElementById('targets-container');
            this.targetInfoName = document.getElementById('target-name');
            this.targetInfoDistance = document.getElementById('target-distance');
            this.targetInfoVelocity = document.getElementById('target-velocity');
            this.targetInfoAngularVelocity = document.getElementById('target-angular-velocity');
        } catch (error) {
            console.warn('Some UI elements not found, running in headless mode', error);
        }
        
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
        
        // Calculate pixel distance
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Convert to meters using scale factor (1 pixel = 100 meters)
        return pixelDistance * this.distanceScaleFactor;
    }
    
    calculateAngularVelocity(ship1, ship2) {
        if (!ship1.components.position || !ship2.components.position) {
            return 0;
        }
        
        // Get positions
        const p1 = ship1.components.position;
        const p2 = ship2.components.position;
        
        // Get velocities - default to zero if not available
        const v1 = ship1.components.velocity || { x: 0, y: 0 };
        const v2 = ship2.components.velocity || { x: 0, y: 0 };
        
        // Calculate relative velocity
        const relVx = v2.x - v1.x;
        const relVy = v2.y - v1.y;
        
        // Calculate position vector from ship1 to ship2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distanceSq = dx * dx + dy * dy;
        
        if (distanceSq < 1) return 0; // Avoid division by zero
        
        const distance = Math.sqrt(distanceSq);
        
        // Calculate the normal vector (perpendicular to position vector)
        const nx = -dy / distance;
        const ny = dx / distance;
        
        // Project relative velocity onto the normal vector to get transverse velocity
        const transverseVelocity = Math.abs(relVx * nx + relVy * ny);
        
        // Angular velocity is transverse velocity / distance (in radians/sec)
        const angularVelocityRad = transverseVelocity / distance;
        
        // Convert to degrees per second (EVE Online format)
        let angularVelocityDeg = angularVelocityRad * (180 / Math.PI);
        
        // If ships are orbiting, ensure minimum angular velocity
        // This simulates the orbiting behavior seen in EVE Online
        if (ship2.components.orbit && ship2.components.orbit.target === ship1.id) {
            const minAngularVel = 0.05;
            angularVelocityDeg = Math.max(angularVelocityDeg, minAngularVel);
        }
        
        return angularVelocityDeg;
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
        try {
            if (!this.targetListContainer) {
                console.debug('Target list container not found');
                return;
            }
            
            // Clear existing entries
            this.targetListContainer.innerHTML = '';
            
            // If no potential targets, show message
            if (!this.potentialTargets || this.potentialTargets.length === 0) {
                const noTargetsMsg = document.createElement('div');
                noTargetsMsg.className = 'no-targets-message';
                noTargetsMsg.textContent = 'No targets in range';
                this.targetListContainer.appendChild(noTargetsMsg);
                return;
            }
            
            // Create target entries
            this.potentialTargets.forEach(target => {
                try {
                    if (!target?.components?.position || !this.player?.components?.position) {
                        return; // Skip if no position data
                    }
                    
                    // Calculate distance to player
                    const distance = this.calculateDistance(
                        this.player.components.position, 
                        target.components.position
                    );
                    
                    // Skip if out of range
                    if (distance > this.maxTargetRange) return;
                    
                    // Create target entry
                    const entry = this.createTargetEntry(target, distance);
                    if (entry) {
                        this.targetListContainer.appendChild(entry);
                    }
                } catch (error) {
                    console.error('Error creating target entry:', error, target);
                }
            });
        } catch (error) {
            console.error('Error in updateTargetList:', error);
        }
    }
    
    createTargetEntry(target, distance) {
        // Create the entry element first
        const entry = document.createElement('div');
        entry.className = 'target-entry';
        
        // Get ship data with null checks
        const ship = target.components?.ship || {};
        const shield = ship.shield || 0;
        const armor = ship.armor || 0;
        const hull = ship.hull || 0;
        const shieldMax = ship.shieldMax || 1; // Avoid division by zero
        const armorMax = ship.armorMax || 1;   // Avoid division by zero
        const hullMax = ship.hullMax || 1;     // Avoid division by zero
        const velocity = ship.velocity || 0;
        const capacitor = ship.capacitor || 0;
        const capacitorMax = Math.max(1, ship.capacitorMax || 1); // Ensure no division by zero
        const angularVelocity = this.calculateAngularVelocity(this.player, target) || 0;
        
        // Format distance (EVE Online style)
        let formattedDistance;
        if (distance < 1000) {
            formattedDistance = `Distance: ${Math.round(distance)}m`;
        } else if (distance < 10000) {
            formattedDistance = `Distance: ${(distance / 1000).toFixed(1)}km`;
        } else {
            formattedDistance = `Distance: ${Math.round(distance / 1000)}km`;
        }
        
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
        
        // Details (angular velocity, velocity, and capacitor)
        const details = document.createElement('div');
        details.className = 'target-details';
        
        // AV with custom tooltip
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'tooltip-container';

        const avElement = document.createElement('div');
        avElement.className = 'av-value';
        avElement.textContent = `AV: ${Math.abs(angularVelocity).toFixed(1)}°/s`;
        
        // Create custom tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = 'Angular Velocity: How fast the target is moving across your field of view.<br><br>' +
                         '• < 5°/s: Easy to track<br>' +
                         '• 5-10°/s: Moderate tracking<br>' +
                         '• > 10°/s: Difficult to track<br>' +
                         '• 0°/s: Target is moving directly toward/away from you';
        
        // Add tooltip events
        avElement.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
            
            // Position tooltip after it's visible to get correct measurements
            setTimeout(() => {
                const rect = avElement.getBoundingClientRect();
                tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                tooltip.style.top = `${rect.top - 5}px`;
            }, 0);
        });
        
        avElement.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        // Add elements to container
        tooltipContainer.appendChild(avElement);
        tooltipContainer.appendChild(tooltip);
        
        // Add tooltip container to details instead of avElement directly
        details.appendChild(tooltipContainer);
        
        // Velocity display
        const velElement = document.createElement('div');
        velElement.className = 'velocity-value';
        velElement.textContent = `Vel: ${Math.round(velocity)} m/s`;
        
        // Capacitor display
        const capElement = document.createElement('div');
        capElement.textContent = `Cap: ${Math.round(capacitor / capacitorMax * 100)}%`;
        
        // We already added the tooltipContainer with avElement
        details.appendChild(velElement);
        details.appendChild(capElement);
        
        // Target button with crosshair
        const targetButton = document.createElement('div');
        targetButton.className = 'target-button';
        targetButton.setAttribute('data-target-id', target.id);
        targetButton.title = this.player.target === target ? 'Unlock Target' : 'Lock Target';
        
        const crosshair = document.createElement('div');
        crosshair.className = 'target-crosshair';
        
        // Set crosshair state based on targeting status
        if (this.player.target === target) {
            crosshair.classList.add('locked');
            crosshair.title = 'Target Locked';
        } else if (this.lockingTarget === target) {
            crosshair.classList.add('locking');
            crosshair.title = 'Locking...';
        } else {
            crosshair.title = 'Lock Target';
        }
        
        targetButton.appendChild(crosshair);
        
        // Add click handler to target button
        targetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.player.target === target) {
                this.unlockTarget();
            } else {
                this.startTargetLock(target);
            }
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
    try {
        // Check if we have the required data and UI elements
        if (!this.player || !this.player.target || !this.targetInfoName || !this.targetInfoDistance || !this.targetInfoVelocity || !this.targetInfoAngularVelocity) {
            return;
        }
        
        const target = this.player.target;
        const targetShip = target.components?.ship;
        
        // Update target name
        if (this.targetInfoName) {
            this.targetInfoName.textContent = targetShip?.name || 'Unknown Target';
        }
        
        // Calculate and update distance if we have position data
        if (this.player.components?.position && target.components?.position) {
            const distance = this.calculateDistance(
                this.player.components.position, 
                target.components.position
            );
            
            // Format distance (EVE Online style)
            let formattedDistance;
            if (distance < 1000) {
                formattedDistance = `Distance: ${Math.round(distance)}m`;
            } else if (distance < 10000) {
                formattedDistance = `Distance: ${(distance / 1000).toFixed(1)}km`;
            } else {
                formattedDistance = `Distance: ${Math.round(distance / 1000)}km`;
            }
            
            if (this.targetInfoDistance) {
                this.targetInfoDistance.textContent = formattedDistance;
            }
        }
        
        // Calculate and update velocity
        if (this.targetInfoVelocity) {
            let velocity = 0;
            if (target.components?.velocity) {
                const velocityComp = target.components.velocity;
                // For ships with maxSpeed defined
                if (velocityComp.maxSpeed) {
                    // If the ship is moving with purpose (orbiting, attacking, or fleeing)
                    if (target.components.orbit || (target.state && ['attacking', 'fleeing'].includes(target.state))) {
                        velocity = velocityComp.maxSpeed * 0.9; // 90% of max speed
                    } else {
                        velocity = velocityComp.maxSpeed * 0.3; // 30% when idle
                    }
                } else {
                    // Fallback to calculated velocity
                    const vx = velocityComp.x || 0;
                    const vy = velocityComp.y || 0;
                    velocity = Math.sqrt(vx * vx + vy * vy);
                }
            }
            this.targetInfoVelocity.textContent = `Velocity: ${Math.round(velocity)}m/s`;
        }
        
        // Calculate and update angular velocity
        if (this.targetInfoAngularVelocity) {
            const angularVelocity = this.calculateAngularVelocity(this.player, target);
            if (angularVelocity !== null && !isNaN(angularVelocity)) {
                this.targetInfoAngularVelocity.textContent = `Angular: ${Math.abs(angularVelocity).toFixed(1)}°/s`;
            } else {
                this.targetInfoAngularVelocity.textContent = 'Angular: --';
            }
        }
    } catch (error) {
        console.error('Error in updateTargetInfo:', error);
    }
}
}
