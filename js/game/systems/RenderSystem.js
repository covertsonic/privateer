export class RenderSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.starfield = this.generateStarfield(200);
        
        // Zoom settings
        this.zoomLevel = 1; // Default zoom level
        this.zoomLevels = {
            S: 1.5,    // Close range (5-10km focus)
            SM: 1.2,   // Small-Medium range
            M: 1.0,    // Medium range (20-30km focus) - Default
            ML: 0.8,   // Medium-Long range
            L: 0.6     // Long range (50-70km focus)
        };
        
        this.lastDebugTime = null;
        this.enemyDebugLogged = false;
        
        // Range marker settings
        this.showRangeMarkers = true; // Toggleable
        this.rangeMarkers = [
            { distance: 5000, color: 'rgba(100, 200, 255, 0.3)' }, // 5km
            { distance: 20000, color: 'rgba(150, 150, 255, 0.2)' }, // 20km
            { distance: 50000, color: 'rgba(200, 100, 255, 0.1)' }  // 50km
        ];
    }
    
    setSize(width, height) {
        // console.log(`RenderSystem: Setting canvas size to ${width}x${height}`);
        this.width = width;
        this.height = height;
        
        // Regenerate starfield to match new canvas size
        this.starfield = this.generateStarfield(200);
        
        // Force a re-render
        this.isDirty = true;
    }
    
    setZoom(zoomKey) {
        if (this.zoomLevels[zoomKey] !== undefined) {
            this.zoomLevel = this.zoomLevels[zoomKey];
            // console.log(`Zoom set to ${zoomKey} (${this.zoomLevel}x)`);
        }
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
    
    render(entityManager, player) {
        try {
            try {
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } catch (e) {
                console.error('[RenderSystem.render] Error during canvas clearing:', e.message, e.stack, e);
            }

            let entities = [];
            try {
                entities = entityManager.getEntitiesWithComponents('renderable');
                // console.log(`Rendering ${entities.length} entities with renderable component`);
            } catch (e) {
                console.error('[RenderSystem.render] Error getting entities from entityManager:', e.message, e.stack, e);
            }

            try {
                // entities.forEach((entity, index) => {
                //     console.log(`Entity ${index + 1}:`, {
                //         id: entity.id,
                //         type: entity.components.renderable.type,
                //         position: entity.components.position ? `(${entity.components.position.x.toFixed(1)}, ${entity.components.position.y.toFixed(1)})` : 'no position',
                //         team: entity.team,
                //         name: entity.name
                //     });
                // });
            } catch (e) {
                console.error('[RenderSystem.render] Error in entities.forEach for logging:', e.message, e.stack, e);
            }

            try {
                this.ctx.save();
                this.applyCameraTransform(player);
            } catch (e) {
                console.error('[RenderSystem.render] Error in applyCameraTransform or ctx.save:', e.message, e.stack, e);
            }

            try {
                this.drawStars();
            } catch (e) {
                console.error('[RenderSystem.render] Error in drawStars:', e.message, e.stack, e);
            }

            try {
                const sortedEntities = [...entities].sort((a, b) => {
                    const aZ = a.components.renderable.zIndex || 0;
                    const bZ = b.components.renderable.zIndex || 0;
                    return aZ - bZ;
                });

                for (const entity of sortedEntities) {
                    if (entity && entity.components && entity.components.position && entity.components.renderable) {
                        try {
                            this.renderEntity(entity, player);
                        } catch (e) {
                            console.error(`[RenderSystem.render] Error rendering entity ID: ${entity.id || 'Unknown ID'}. Error:`, e);
                            console.log('Problematic entity state:', JSON.stringify(entity.components));
                        }
                    }
                }
            } catch (e) {
                console.error('[RenderSystem.render] Error in rendering entities:', e.message, e.stack, e);
            }

            const playerHasPosition = player && player.components && player.components.position;
            if (this.showRangeMarkers && player && playerHasPosition) { 
                const playerPosition = player.components.position;
                try {
                    this.renderRangeMarkers(playerPosition);
                } catch (e) {
                    console.error('[RenderSystem.render] Error in renderRangeMarkers:', e.message, e.stack, e);
                }
            }

            try {
                this.ctx.restore(); 
            } catch (e) {
                console.error('[RenderSystem.render] Error in ctx.restore():', e.message, e.stack, e);
            }

            try {
                this.drawUI(entityManager);
            } catch (e) {
                console.error('[RenderSystem.render] Error in drawUI:', e.message, e.stack, e);
            }
        } catch (e) {
            console.error('[RenderSystem.render] General error in render function. Message:', e.message, 'Stack:', e.stack, 'Error Object:', e);
        }
    }

    applyCameraTransform(player) {
        const ctx = this.ctx;

        if (player && player.components.position) {
            const playerPos = player.components.position;
            ctx.translate(this.width / 2 - playerPos.x * this.zoomLevel, this.height / 2 - playerPos.y * this.zoomLevel);
        } else {
            ctx.translate(this.width / 2, this.height / 2);
        }

        ctx.scale(this.zoomLevel, this.zoomLevel);
    }

    drawStars() {
        this.renderStarfield();
    }

    drawUI(entityManager) {
        const playerShip = entityManager.getPlayerShip();
        if (playerShip && playerShip.target) {
            this.renderTargetIndicator(playerShip.target);
        }

        if (playerShip && playerShip.lockingTarget) {
            this.renderLockingIndicator(playerShip.lockingTarget);
        }
    }

    renderEntity(entity, player) {
        const { position, renderable, rotation } = entity.components;
        const ctx = this.ctx;

        if (entity.constructor.name === 'EnemyShip' && !this.enemyDebugLogged) {
            console.log('Rendering enemy ship:', {
                id: entity.id,
                position: position,
                renderable: renderable,
                rotation: rotation
            });
            this.enemyDebugLogged = true;
        }

        ctx.save();

        ctx.translate(position.x, position.y);

        if (rotation) {
            ctx.rotate(rotation.angle);
        }

        switch (renderable.type) {
            case 'ship':
                try {
                    this.renderShip(entity, player);
                } catch (e) {
                    console.error(`[RenderSystem.renderEntity] Error rendering ship ID: ${entity.id || 'Unknown ID'}. Error:`, e);
                    console.log(`[RenderSystem.renderEntity] Entity components:`, JSON.stringify(entity.components, null, 2));
                    if (player && player.components) {
                        console.log(`[RenderSystem.renderEntity] Player components:`, JSON.stringify(player.components, null, 2));
                    }
                }
                break;
            case 'projectile':
                this.renderProjectile(entity);
                break;
            case 'effect':
                this.renderEffect(entity);
                break;
            default:
                console.warn('Unknown renderable type:', renderable.type, 'for entity:', entity.id);
                this.renderDefault(entity);
        }

        ctx.restore();
    }

    renderShip(entity, player) {
        try {
            const ctx = this.ctx;
            const { renderable, rotation: shipRotationComp, position: entityPos, velocity } = entity.components;

            if (!renderable) {
                console.warn(`[RenderSystem.renderShip] Entity ${entity.id} has no renderable component.`);
                return;
            }
            if (!shipRotationComp) {
                console.warn(`[RenderSystem.renderShip] Entity ${entity.id} has no rotation component.`);
            }
            if (!entityPos) {
                console.warn(`[RenderSystem.renderShip] Entity ${entity.id} has no position component.`);
                return;
            }

            // Draw ship body
            ctx.fillStyle = renderable.color || '#4a8cff';
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, -8);
            ctx.lineTo(-10, 8);
            ctx.closePath();
            ctx.fill();

            // Draw engine glow if moving
            if (velocity) {
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
                if (speed > 0.1) {
                    ctx.fillStyle = '#ff9900';
                    ctx.beginPath();
                    ctx.moveTo(-10, -4);
                    ctx.lineTo(-15, 0);
                    ctx.lineTo(-10, 4);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            if (entity.components.health) {
                this.renderHealthBar(entity);
            }
        } catch (e) {
            console.error(`[RenderSystem.renderShip] Error rendering ship ID: ${entity.id || 'Unknown ID'}. Error:`, e);
            console.log(`[RenderSystem.renderShip] Entity components:`, JSON.stringify(entity.components, null, 2));
            if (player && player.components) {
                console.log(`[RenderSystem.renderShip] Player components:`, JSON.stringify(player.components, null, 2));
            }
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
    }

    renderDefault(entity) {
        const { renderable } = entity.components;
        const ctx = this.ctx;

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

    toggleRangeMarkers() {
        this.showRangeMarkers = !this.showRangeMarkers;
        console.log(`[RenderSystem] Range markers ${this.showRangeMarkers ? 'enabled' : 'disabled'}`);
        return this.showRangeMarkers;
    }

    renderRangeMarkers(playerPosition) {
        if (!playerPosition) return;
        
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const scaleFactor = 0.01; // Same as in applyCameraTransform
        
        ctx.save();
        ctx.setLineDash([5, 5]);

        this.rangeMarkers.forEach(marker => {
            const radius = marker.distance * scaleFactor * this.zoomLevel;
            
            ctx.strokeStyle = marker.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Add distance labels
            ctx.font = '12px Arial';
            ctx.fillStyle = marker.color.replace('0.3', '0.8').replace('0.2', '0.8').replace('0.1', '0.8');
            ctx.textAlign = 'center';
            
            let displayDistance;
            if (marker.distance >= 1000) {
                displayDistance = `${marker.distance / 1000}km`;
            } else {
                displayDistance = `${marker.distance}m`;
            }
            
            ctx.fillText(displayDistance, centerX, centerY - radius - 5);
        });
        
        ctx.setLineDash([]);
        ctx.restore();
    }

    renderLockingIndicator(target) {
        if (!target || !target.components.position) return;

        const pos = target.components.position;
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        ctx.strokeStyle = 'rgba(255, 74, 74, 0.7)';
        ctx.setLineDash([]);

        const cornerSize = 5;

        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2 + cornerSize);
        ctx.lineTo(-size/2, -size/2);
        ctx.lineTo(-size/2 + cornerSize, -size/2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size/2 - cornerSize, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(size/2, -size/2 + cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-size/2, size/2 - cornerSize);
        ctx.lineTo(-size/2, size/2);
        ctx.lineTo(-size/2 + cornerSize, size/2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size/2 - cornerSize, size/2);
        ctx.lineTo(size/2, size/2);
        ctx.lineTo(size/2, size/2 - cornerSize);
        ctx.stroke();

        ctx.restore();
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
}

renderDefault(entity) {
    const { renderable } = entity.components;
    const ctx = this.ctx;

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

    ctx.strokeStyle = '#FF4A4A';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);

    const size = 30;
    ctx.strokeRect(-size/2, -size/2, size, size);

    ctx.setLineDash([]);

    const cornerSize = 5;

    ctx.beginPath();
    ctx.moveTo(-size/2, -size/2 + cornerSize);
    ctx.lineTo(-size/2, -size/2);
    ctx.lineTo(-size/2 + cornerSize, -size/2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size/2 - cornerSize, -size/2);
    ctx.lineTo(size/2, -size/2);
    ctx.lineTo(size/2, -size/2 + cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size/2, size/2 - cornerSize);
    ctx.lineTo(-size/2, size/2);
    ctx.lineTo(-size/2 + cornerSize, size/2);
    ctx.stroke();

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

    ctx.strokeStyle = 'rgba(255, 74, 74, 0.7)';
    ctx.lineWidth = 1.5;

    const time = Date.now() / 1000;
    const pulseSize = 32 + Math.sin(time * 5) * 3;

    ctx.beginPath();
    ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

toggleRangeMarkers() {
    this.showRangeMarkers = !this.showRangeMarkers;
    console.log(`[RenderSystem] Range markers ${this.showRangeMarkers ? 'enabled' : 'disabled'}`);
    return this.showRangeMarkers;
}

renderRangeMarkers(playerPosition) {
    if (!playerPosition) return;
    
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const scaleFactor = 0.01;
    
    ctx.save();
    ctx.setLineDash([5, 5]);

    this.rangeMarkers.forEach(marker => {
        const radius = marker.distance * scaleFactor * this.zoomLevel;
        
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add distance labels
        ctx.font = '12px Arial';
        ctx.fillStyle = marker.color.replace('0.3', '0.8').replace('0.2', '0.8').replace('0.1', '0.8');
        ctx.textAlign = 'center';
        
        let displayDistance;
        if (marker.distance >= 1000) {
            displayDistance = `${marker.distance / 1000}km`;
        } else {
            displayDistance = `${marker.distance}m`;
        }
        
        ctx.fillText(displayDistance, centerX, centerY - radius - 5);
    });
    
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

        ctx.beginPath();

        ctx.arc(target.components.position.x, target.components.position.y, size, 0, Math.PI * 2);

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
