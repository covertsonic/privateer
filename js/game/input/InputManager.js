export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            buttons: {},
            wheel: 0
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            // Prevent default for space and arrow keys to avoid scrolling
            if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault();
            }
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        window.addEventListener('mousedown', (e) => {
            this.mouse.buttons[e.button] = true;
        });
        
        window.addEventListener('mouseup', (e) => {
            this.mouse.buttons[e.button] = false;
        });
        
        window.addEventListener('wheel', (e) => {
            this.mouse.wheel = Math.sign(e.deltaY);
            e.preventDefault();
        }, { passive: false });
        
        // Prevent context menu on right click
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    isKeyDown(key) {
        return !!this.keys[key.toLowerCase()];
    }
    
    isKeyPressed(key) {
        // This would need to track key press state between frames
        // For now, just return the current state
        return this.isKeyDown(key);
    }
    
    isMouseButtonDown(button = 0) {
        return !!this.mouse.buttons[button];
    }
    
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    getMouseWheel() {
        const wheel = this.mouse.wheel;
        this.mouse.wheel = 0; // Reset after reading
        return wheel;
    }
    
    update() {
        // Update input states that need frame-by-frame tracking
        // Currently empty as we're not tracking pressed/released states
    }
    
    clear() {
        // Clear all input states
        this.keys = {};
        this.mouse.buttons = {};
        this.mouse.wheel = 0;
    }
}
