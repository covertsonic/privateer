export class RenderSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.starfield = this.generateStarfield(200);
    }
    
    setCanvasSize(width, height) {
        this.width = width;
        this.height = height;
        
        // Regenerate starfield to match new canvas size
        this.starfield = this.generateStarfield(200);
    }
    
    generateStarfield(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5,
                alpha: 0.1 + Math.random() * 0.5
            });
        }
        return stars;
    }
    
    renderStarfield() {
        const ctx = this.ctx;
        ctx.fillStyle = '#FFFFFF';
        
        for (const star of this.starfield) {
            ctx.globalAlpha = star.alpha;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    render(entityManager, playerShip) {
        const ctx = this.ctx;
        
        // Clear the canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw starfield
        this.renderStarfield();
        
        // Get all renderable entities
        const renderables = entityManager.getEntitiesWithComponents('position', 'renderable');
        
        // Sort by z-index if needed
        renderables.sort((a, b) => {
            const aZ = a.components.renderable.zIndex || 0;
            const bZ = b.components.renderable.zIndex || 0;
            return aZ - bZ;
        });
        
        // Draw all entities
        for (const entity of renderables) {
            this.renderEntity(entity, playerShip);
        }
        
        // Draw targeting indicators last so they're on top
        if (playerShip && playerShip.target) {
            this.renderTargetIndicator(playerShip.target);
        }
        
        // Draw locking target indicator if applicable
        if (playerShip && playerShip.lockingTarget) {
            this.renderLockingIndicator(playerShip.lockingTarget);
        }
    }
    
    renderEntity(entity, playerShip) {
        const { position, renderable, rotation } = entity.components;
        const ctx = this.ctx;
        
        ctx.save();
        
        // Move to entity position
        ctx.translate(position.x, position.y);
        
        // Apply rotation if entity has rotation component
        if (rotation) {
            ctx.rotate(rotation.angle);
        }
        
        // Draw based on renderable type
        switch (renderable.type) {
            case 'ship':
                this.renderShip(entity);
                break;
            case 'projectile':
                this.renderProjectile(entity);
                break;
            case 'effect':
                this.renderEffect(entity);
                break;
            default:
                this.renderDefault(entity);
        }
        
        ctx.restore();
    }
    
    renderShip(entity) {
        const { renderable } = entity.components;
        const ctx = this.ctx;
        
        // Ship body color
        ctx.fillStyle = renderable.color || '#4a8cff';
        
        // Draw a simple triangle for the ship
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        
        // Draw engine glow
        ctx.fillStyle = '#44AAFF';
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();
        if (entity.components.velocity) {
            const speed = Math.sqrt(
                entity.components.velocity.x * entity.components.velocity.x + 
                entity.components.velocity.y * entity.components.velocity.y
            );
            
            if (speed > 0.1) {
                ctx.fillStyle = '#ff9900';
                ctx.beginPath();
                ctx.moveTo(-4, 10);
                ctx.lineTo(0, 15);
                ctx.lineTo(4, 10);
                ctx.closePath();
                ctx.fill();
            }
        }
        
        // Draw health bar if ship has health
        if (entity.components.health) {
            this.renderHealthBar(entity);
        }
    }
    
    renderProjectile(entity) {
        const { renderable } = entity.components;
        const ctx = this.ctx;
        
        ctx.fillStyle = renderable.color || '#ff5555';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderEffect(entity) {
        // Placeholder for effects like explosions, engine trails, etc.
    }
    
    renderDefault(entity) {
        const { renderable } = entity.components;
        const ctx = this.ctx;
        
        // Default rendering as a colored circle
        ctx.fillStyle = renderable.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHealthBar(entity) {
        const { health } = entity.components;
        const width = 30;
        const height = 4;
        const healthPercent = health.current / health.max;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(-width/2, -20, width, height);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(-width/2, -20, width * healthPercent, height);
    }
    
    renderTargetIndicator(target) {
        if (!target || !target.components.position) return;
        
        const pos = target.components.position;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // Draw targeting box
        ctx.strokeStyle = '#FF4A4A';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        
        // Size based on ship size (approximated)
        const size = 30;
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        // Draw corner accents
        ctx.setLineDash([]);
        const cornerSize = 5;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2 + cornerSize);
        ctx.lineTo(-size/2, -size/2);
        ctx.lineTo(-size/2 + cornerSize, -size/2);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(size/2 - cornerSize, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(size/2, -size/2 + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(-size/2, size/2 - cornerSize);
        ctx.lineTo(-size/2, size/2);
        ctx.lineTo(-size/2 + cornerSize, size/2);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(size/2 - cornerSize, size/2);
        ctx.lineTo(size/2, size/2);
        ctx.lineTo(size/2, size/2 - cornerSize);
        ctx.stroke();
        
        ctx.restore();
    }
    
    renderLockingIndicator(target) {
        if (!target || !target.components.position) return;
        
        const pos = target.components.position;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // Draw targeting circle (animated)
        ctx.strokeStyle = 'rgba(255, 74, 74, 0.7)';
        ctx.lineWidth = 1.5;
        
        // Pulsing effect
        const time = Date.now() / 1000;
        const pulseSize = 32 + Math.sin(time * 5) * 3;
        
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner dashed circle (rotating)
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        
        // Rotating effect
        ctx.save();
        ctx.rotate(time * 2);
        
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        ctx.setLineDash([]);
        
        ctx.restore();
    }
    
    drawTargetReticle(target) {
        if (!target.components.position) return;
        
        const ctx = this.ctx;
        const size = 20;
        const thickness = 2;
        
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = thickness;
        
        // Draw a simple crosshair at target position
        ctx.beginPath();
        
        // Outer circle
        ctx.arc(target.components.position.x, target.components.position.y, size, 0, Math.PI * 2);
        
        // Crosshair lines
        ctx.moveTo(target.components.position.x - size - 5, target.components.position.y);
        ctx.lineTo(target.components.position.x - size / 2, target.components.position.y);
        
        ctx.moveTo(target.components.position.x + size / 2, target.components.position.y);
        ctx.lineTo(target.components.position.x + size + 5, target.components.position.y);
        
        ctx.moveTo(target.components.position.x, target.components.position.y - size - 5);
        ctx.lineTo(target.components.position.x, target.components.position.y - size / 2);
        
        ctx.moveTo(target.components.position.x, target.components.position.y + size / 2);
        ctx.lineTo(target.components.position.x, target.components.position.y + size + 5);
        
        ctx.stroke();
        ctx.restore();
    }
}
