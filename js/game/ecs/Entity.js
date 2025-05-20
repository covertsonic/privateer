export class Entity {
    constructor() {
        this.id = Math.random().toString(36).substr(2, 9);
        this.components = {};
        this.tags = new Set();
        this.game = null; // Will be set when added to the game
    }
    
    addComponent(componentName, componentData) {
        this.components[componentName] = componentData;
        return this;
    }
    
    removeComponent(componentName) {
        delete this.components[componentName];
        return this;
    }
    
    hasComponent(componentName) {
        return this.components.hasOwnProperty(componentName);
    }
    
    getComponent(componentName) {
        return this.components[componentName];
    }
    
    addTag(tag) {
        this.tags.add(tag);
        return this;
    }
    
    removeTag(tag) {
        this.tags.delete(tag);
        return this;
    }
    
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    // Called when the entity is added to the game
    onAdd(game) {
        this.game = game;
    }
    
    // Called when the entity is removed from the game
    onRemove() {
        // Clean up any resources
    }
    
    // Update method to be overridden by subclasses
    update(deltaTime, inputManager) {
        // Base entity update logic (none by default)
    }
}
