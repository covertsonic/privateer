export class EntityManager {
    constructor() {
        this.entities = new Set();
        this.components = new Map(); // component name -> Set of entities with that component
        this.nextEntityId = 0;
    }
    
    createEntity() {
        const id = this.nextEntityId++;
        const entity = { id, components: {} };
        this.entities.add(entity);
        return entity;
    }
    
    addEntity(entity) {
        this.entities.add(entity);
        return entity;
    }
    
    removeEntity(entity) {
        // Remove from all component maps
        for (const componentName in entity.components) {
            this.removeComponent(entity, componentName);
        }
        
        // Remove from entities set
        this.entities.delete(entity);
    }
    
    addComponent(entity, componentName, componentData) {
        // Remove existing component if it exists
        if (entity.components[componentName]) {
            this.removeComponent(entity, componentName);
        }
        
        // Add component to entity
        entity.components[componentName] = componentData;
        
        // Add entity to component map
        if (!this.components.has(componentName)) {
            this.components.set(componentName, new Set());
        }
        this.components.get(componentName).add(entity);
        
        return entity;
    }
    
    removeComponent(entity, componentName) {
        if (!entity.components[componentName]) return;
        
        // Remove from component map
        if (this.components.has(componentName)) {
            this.components.get(componentName).delete(entity);
        }
        
        // Remove from entity
        delete entity.components[componentName];
        
        return entity;
    }
    
    getComponents(componentName) {
        if (!this.components.has(componentName)) {
            return [];
        }
        return Array.from(this.components.get(componentName));
    }
    
    getEntities() {
        return Array.from(this.entities);
    }
    
    getEntitiesWithComponents(...componentNames) {
        return this.getEntities().filter(entity => 
            componentNames.every(componentName => entity.components[componentName])
        );
    }
    
    getFirstEntityWithComponents(...componentNames) {
        return this.getEntities().find(entity => 
            componentNames.every(componentName => entity.components[componentName])
        );
    }
    
    clear() {
        this.entities.clear();
        this.components.clear();
        this.nextEntityId = 0;
    }
}
