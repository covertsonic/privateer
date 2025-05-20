import { Ship } from './Ship.js';
import { Weapon } from '../modules/Weapon.js';
import { ShieldModule } from '../modules/ShieldModule.js';
import { ArmorModule } from '../modules/ArmorModule.js';
import { PropulsionModule } from '../modules/PropulsionModule.js';

export class PlayerShip extends Ship {
    constructor(x, y) {
        super(x, y, {
            name: 'Player Ship',
            maxSpeed: 250,
            acceleration: 150,
            rotationSpeed: 4,
            maxHealth: 150,
            shield: 75,
            armor: 50,
            color: '#4a8cff'
        });
        
        // Player-specific properties
        this.target = null;
        this.orbitTarget = null;
        this.orbitDistance = 150;
        this.orbitSpeed = 1.5;
    }
    
    initializeModules() {
        // Add weapons
        const mainWeapon = new Weapon(this, {
            damage: 10,
            fireRate: 1.5, // shots per second
            range: 400,
            projectileSpeed: 500,
            energyCost: 5,
            color: '#ff5555',
            name: 'Light Laser'
        });
        
        this.weapons.push(mainWeapon);
        
        // Add shield module
        const shieldModule = new ShieldModule(this, {
            strength: 75,
            rechargeRate: 5, // per second
            energyCost: 10,
            cooldown: 5 // seconds
        });
        
        // Add armor module
        const armorModule = new ArmorModule(this, {
            repairRate: 10, // per second
            energyCost: 15,
            cooldown: 8 // seconds
        });
        
        // Add propulsion module
        const propulsionModule = new PropulsionModule(this, {
            speedBoost: 1.5,
            duration: 5, // seconds
            energyCost: 20,
            cooldown: 10 // seconds
        });
        
        this.modules.push(shieldModule, armorModule, propulsionModule);
    }
    
    update(deltaTime, inputManager) {
        // Call parent update first
        super.update(deltaTime, inputManager);
        
        const velocity = this.components.velocity;
        const rotation = this.components.rotation;
        
        // Handle rotation
        if (inputManager.isKeyDown('a') || inputManager.isKeyDown('arrowleft')) {
            rotation.angle += velocity.rotationSpeed * deltaTime;
        }
        if (inputManager.isKeyDown('d') || inputManager.isKeyDown('arrowright')) {
            rotation.angle -= velocity.rotationSpeed * deltaTime;
        }
        
        // Handle thrust
        if (inputManager.isKeyDown('w') || inputManager.isKeyDown('arrowup')) {
            const angle = rotation.angle;
            velocity.x += Math.cos(angle) * velocity.acceleration * deltaTime;
            velocity.y -= Math.sin(angle) * velocity.acceleration * deltaTime;
            
            // Limit speed
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            if (speed > velocity.maxSpeed) {
                velocity.x = (velocity.x / speed) * velocity.maxSpeed;
                velocity.y = (velocity.y / speed) * velocity.maxSpeed;
            }
        }
        
        // Handle braking
        if (inputManager.isKeyDown('s') || inputManager.isKeyDown('arrowdown')) {
            velocity.x *= 0.95;
            velocity.y *= 0.95;
        }
        
        // Handle shooting
        if (inputManager.isKeyDown(' ') || inputManager.isMouseButtonDown(0)) {
            if (this.target) {
                this.attack(this.target);
            }
        }
        
        // Handle module activation with number keys
        if (inputManager.isKeyPressed('1')) {
            this.activateModule('weapon');
        } else if (inputManager.isKeyPressed('2')) {
            this.activateModule('propulsion');
        } else if (inputManager.isKeyPressed('3')) {
            this.activateModule('shield');
        } else if (inputManager.isKeyPressed('4')) {
            this.activateModule('armor');
        }
        
        // Update UI
        this.updateUI();
    }
    
    activateModule(moduleType) {
        const module = this.modules.find(m => m.type === moduleType);
        if (module && module.activate) {
            module.activate();
            
            // Update UI to show active module
            document.querySelectorAll('.module-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.module === moduleType) {
                    btn.classList.add('active');
                }
            });
        }
    }
    
    updateUI() {
        // Update health bars
        const health = this.components.health;
        const shieldBar = document.getElementById('shield-bar');
        const armorBar = document.getElementById('armor-bar');
        const hullBar = document.getElementById('hull-bar');
        
        if (shieldBar) {
            const shieldPercent = (health.shield / 75) * 100; // 75 is the max shield from constructor
            shieldBar.style.width = `${Math.max(0, shieldPercent)}%`;
            
            // Change color based on shield level
            if (shieldPercent < 20) {
                shieldBar.style.background = 'linear-gradient(90deg, #ff0000, #ff6a00)';
            } else if (shieldPercent < 50) {
                shieldBar.style.background = 'linear-gradient(90deg, #ff6a00, #ffd900)';
            } else {
                shieldBar.style.background = 'linear-gradient(90deg, #4a8cff, #00a8ff)';
            }
        }
        
        if (armorBar) {
            const armorPercent = (health.armor / 50) * 100; // 50 is the max armor from constructor
            armorBar.style.width = `${Math.max(0, armorPercent)}%`;
            
            // Change color based on armor level
            if (armorPercent < 20) {
                armorBar.style.background = 'linear-gradient(90deg, #ff0000, #ff6a00)';
            } else if (armorPercent < 50) {
                armorBar.style.background = 'linear-gradient(90deg, #ff6a00, #ffd900)';
            } else {
                armorBar.style.background = 'linear-gradient(90deg, #ff5555, #ff9999)';
            }
        }
        
        if (hullBar) {
            const hullPercent = (health.current / health.max) * 100;
            hullBar.style.width = `${Math.max(0, hullPercent)}%`;
            
            // Change color based on hull level
            if (hullPercent < 20) {
                hullBar.style.background = 'linear-gradient(90deg, #ff0000, #ff6a00)';
            } else if (hullPercent < 50) {
                hullBar.style.background = 'linear-gradient(90deg, #ff6a00, #ffd900)';
            } else {
                hullBar.style.background = 'linear-gradient(90deg, #00aa00, #00ff00)';
            }
        }
    }
}
