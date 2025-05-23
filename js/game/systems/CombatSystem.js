/**
 * CombatSystem - Handles combat mechanics like damage, projectiles, and weapon firing
 */
export class CombatSystem {
    constructor() {
        this.projectiles = [];
        this.weaponCooldowns = new Map();
    }
    
    update(deltaTime, entityManager) {
        // Update all projectiles
        const projectiles = entityManager.getEntities().filter(e => 
            e.components && e.components.renderable && e.components.renderable.type === 'projectile'
        );
        
        for (const projectile of projectiles) {
            this.updateProjectile(projectile, deltaTime, entityManager);
        }
        
        // Update weapon cooldowns
        for (const [entityId, cooldown] of this.weaponCooldowns) {
            if (cooldown > 0) {
                this.weaponCooldowns.set(entityId, Math.max(0, cooldown - deltaTime));
            }
        }
        
        // Check for collisions
        this.checkCollisions(entityManager);
    }
    
    updateProjectile(projectile, deltaTime, entityManager) {
        const position = projectile.components.position;
        const velocity = projectile.components.velocity;
        const lifetime = projectile.components.lifetime;
        
        // Update lifetime
        if (lifetime) {
            lifetime.current -= deltaTime;
            if (lifetime.current <= 0) {
                entityManager.removeEntity(projectile);
                return;
            }
        }
        
        // Projectile movement is handled by PhysicsSystem
    }
    
    checkCollisions(entityManager) {
        const projectiles = entityManager.getEntities().filter(e => 
            e.components && e.components.renderable && e.components.renderable.type === 'projectile'
        );
        
        const ships = entityManager.getEntities().filter(e => 
            e.components && e.components.renderable && e.components.renderable.type === 'ship'
        );
        
        for (const projectile of projectiles) {
            const projPos = projectile.components.position;
            const projTeam = projectile.components.team;
            
            for (const ship of ships) {
                // Don't hit ships on the same team
                if (ship.team === projTeam) continue;
                
                const shipPos = ship.components.position;
                const shipCollider = ship.components.collider;
                
                if (!shipCollider) continue;
                
                // Simple circle collision detection
                const dx = projPos.x - shipPos.x;
                const dy = projPos.y - shipPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < shipCollider.radius) {
                    // Hit detected
                    this.handleHit(projectile, ship, entityManager);
                    break;
                }
            }
        }
    }
    
    handleHit(projectile, target, entityManager) {
        const damage = projectile.components.damage || { amount: 10, type: 'kinetic' };
        
        // Apply damage to target
        if (target.takeDamage) {
            target.takeDamage(damage.amount, damage.type);
        }
        
        // Remove projectile
        entityManager.removeEntity(projectile);
        
        // TODO: Add hit effects
    }
    
    fireWeapon(attacker, target, weaponType = 'autocannon') {
        const attackerPos = attacker.components.position;
        const targetPos = target.components.position;
        
        if (!attackerPos || !targetPos) return;
        
        // Check cooldown
        const cooldownKey = `${attacker.id}-${weaponType}`;
        const cooldown = this.weaponCooldowns.get(cooldownKey) || 0;
        if (cooldown > 0) return;
        
        // Calculate direction to target
        const dx = targetPos.x - attackerPos.x;
        const dy = targetPos.y - attackerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Create projectile
        const projectileSpeed = 500; // m/s
        const projectile = {
            id: 'projectile-' + Date.now() + '-' + Math.random(),
            components: {
                position: {
                    x: attackerPos.x + dirX * 20, // Start slightly in front of attacker
                    y: attackerPos.y + dirY * 20
                },
                velocity: {
                    x: dirX * projectileSpeed,
                    y: dirY * projectileSpeed
                },
                renderable: {
                    type: 'projectile',
                    color: '#ffaa00',
                    size: 3
                },
                damage: {
                    amount: 15,
                    type: 'kinetic'
                },
                lifetime: {
                    current: 2, // seconds
                    max: 2
                },
                team: attacker.team
            }
        };
        
        // Add to entity manager
        attacker.entityManager?.addEntity(projectile);
        
        // Set cooldown
        this.weaponCooldowns.set(cooldownKey, 0.5); // 0.5 second cooldown
    }
}
