export class POISystem {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.poiContainer = document.getElementById('poi-container');
        this.distanceScaleFactor = 100; // 1 pixel = 100m
    }

    setPlayer(player) {
        this.player = player;
    }

    update(deltaTime, entityManager) {
        if (!this.player || !this.poiContainer) return;
        const pois = entityManager.getEntities().filter(e => e.tags && e.tags.has('poi'));

        this.poiContainer.innerHTML = '';

        if (pois.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'no-poi-message';
            msg.textContent = 'No points of interest';
            this.poiContainer.appendChild(msg);
            return;
        }

        pois.forEach(poi => {
            if (!poi.components.position) return;
            const distance = this.calculateDistance(this.player.components.position, poi.components.position);
            const entry = this.createEntry(poi, distance);
            this.poiContainer.appendChild(entry);
        });
    }

    calculateDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy) * this.distanceScaleFactor;
    }

    createEntry(poi, distance) {
        const entry = document.createElement('div');
        entry.className = 'poi-entry';

        const name = document.createElement('div');
        name.className = 'poi-name';
        name.textContent = poi.name || 'POI';

        const dist = document.createElement('div');
        dist.className = 'poi-distance';
        dist.textContent = distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`;

        entry.appendChild(name);
        entry.appendChild(dist);
        return entry;
    }
}
