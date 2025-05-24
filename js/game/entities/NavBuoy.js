import { Entity } from '../ecs/Entity.js';

export class NavBuoy extends Entity {
    constructor(x, y, options = {}) {
        super();
        this.name = options.name || 'Navigation Buoy';

        this.addComponent('position', { x, y });

        this.addComponent('renderable', {
            type: 'navBuoy',
            color: options.color || '#ffcc00',
            zIndex: options.zIndex ?? 1
        });

        this.addComponent('collider', {
            radius: options.radius || 5,
            type: 'poi'
        });

        this.addTag('poi');
    }
}
