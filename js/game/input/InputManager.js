export class InputManager {
    constructor() {
        this.keys = {};
        this.keysPressed = {}; // Track keys that were just pressed this frame
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
            const key = e.key.toLowerCase();
            if (!this.keys[key]) {
                this.keysPressed[key] = true;
            }
            this.keys[key] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            this.keysPressed[key] = false;
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
        // Returns true only on the frame the key was pressed
        return !!this.keysPressed[key.toLowerCase()];
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
        // Clear pressed keys after each frame
        for (const key in this.keysPressed) {
            this.keysPressed[key] = false;
        }
    }
    
    clear() {
        // Clear all input states
        this.keys = {};
        this.keysPressed = {};
        this.mouse.buttons = {};
        this.mouse.wheel = 0;
    }
    
    resetPressedKeys() {
        // Clear just the pressed keys (used at the end of each frame)
        this.keysPressed = {};
    }
}
