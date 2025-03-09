import { keys } from './game-state.js';
import { getPlayerObject } from './player.js';

// Touch controls state
const touchControls = {
    active: false,
    joystickActive: false,
    lookActive: false,
    joystickOrigin: { x: 0, y: 0 },
    joystickPosition: { x: 0, y: 0 },
    lookOrigin: { x: 0, y: 0 },
    lookDelta: { x: 0, y: 0 },
    jumpButtonActive: false,
    dashButtonActive: false,
    scanButtonActive: false
};

// Initialize touch controls
function initTouchControls() {
    // Check if device is touch-capable
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        touchControls.active = true;
        createTouchInterface();
    }
    
    // Set up event listeners for touch controls
    setupTouchEventListeners();
    
    return touchControls;
}

// Create touch interface elements
function createTouchInterface() {
    // Create container for touch controls
    const touchControlsContainer = document.createElement('div');
    touchControlsContainer.id = 'touch-controls';
    document.getElementById('ui-container').appendChild(touchControlsContainer);
    
    // Virtual joystick for movement
    const joystick = document.createElement('div');
    joystick.id = 'joystick';
    joystick.innerHTML = '<div id="joystick-knob"></div>';
    touchControlsContainer.appendChild(joystick);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.id = 'action-buttons';
    touchControlsContainer.appendChild(actionButtons);
    
    // Jump button
    const jumpButton = document.createElement('div');
    jumpButton.id = 'jump-button';
    jumpButton.className = 'action-button';
    jumpButton.innerHTML = 'JUMP';
    actionButtons.appendChild(jumpButton);
    
    // Dash button
    const dashButton = document.createElement('div');
    dashButton.id = 'dash-button';
    dashButton.className = 'action-button';
    dashButton.innerHTML = 'DASH';
    actionButtons.appendChild(dashButton);
    
    // Scan button
    const scanButton = document.createElement('div');
    scanButton.id = 'scan-button';
    scanButton.className = 'action-button';
    scanButton.innerHTML = 'SCAN';
    actionButtons.appendChild(scanButton);
    
    // Touch area for camera look
    const lookArea = document.createElement('div');
    lookArea.id = 'look-area';
    touchControlsContainer.appendChild(lookArea);
}

// Set up touch event listeners
function setupTouchEventListeners() {
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    document.addEventListener('touchend', handleTouchEnd, false);
}

// Handle touch start events
function handleTouchStart(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        const target = touch.target;
        
        // Handle joystick activation
        if (target.id === 'joystick' || target.id === 'joystick-knob') {
            touchControls.joystickActive = true;
            touchControls.joystickOrigin = { x: touch.clientX, y: touch.clientY };
            touchControls.joystickPosition = { x: touch.clientX, y: touch.clientY };
            updateJoystickPosition();
        }
        
        // Handle action buttons
        if (target.id === 'jump-button') {
            touchControls.jumpButtonActive = true;
            keys.jump = true;
        } else if (target.id === 'dash-button') {
            touchControls.dashButtonActive = true;
            keys.dash = true;
        } else if (target.id === 'scan-button') {
            touchControls.scanButtonActive = true;
            keys.scan = true;
        }
        
        // Handle look area
        if (target.id === 'look-area') {
            touchControls.lookActive = true;
            touchControls.lookOrigin = { x: touch.clientX, y: touch.clientY };
            touchControls.lookDelta = { x: 0, y: 0 };
        }
    }
}

// Handle touch move events
function handleTouchMove(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        const target = touch.target;
        
        // Update joystick position
        if ((target.id === 'joystick' || target.id === 'joystick-knob') && touchControls.joystickActive) {
            touchControls.joystickPosition = { x: touch.clientX, y: touch.clientY };
            updateJoystickPosition();
            updateMovementFromJoystick();
        }
        
        // Update look position
        if (target.id === 'look-area' && touchControls.lookActive) {
            touchControls.lookDelta = {
                x: touch.clientX - touchControls.lookOrigin.x,
                y: touch.clientY - touchControls.lookOrigin.y
            };
            updateLookFromTouch();
            
            // Reset origin for continuous rotation
            touchControls.lookOrigin = { x: touch.clientX, y: touch.clientY };
        }
    }
}

// Handle touch end events
function handleTouchEnd(event) {
    event.preventDefault();
    
    // Check which touches ended
    const activeTouchIds = Array.from(event.touches).map(touch => touch.identifier);
    
    // Check for joystick deactivation
    if (touchControls.joystickActive) {
        let joystickTouchActive = false;
        for (let i = 0; i < event.touches.length; i++) {
            const target = event.touches[i].target;
            if (target.id === 'joystick' || target.id === 'joystick-knob') {
                joystickTouchActive = true;
                break;
            }
        }
        
        if (!joystickTouchActive) {
            touchControls.joystickActive = false;
            resetJoystick();
        }
    }
    
    // Check for action button deactivation
    let jumpTouchActive = false;
    let dashTouchActive = false;
    let scanTouchActive = false;
    
    for (let i = 0; i < event.touches.length; i++) {
        const target = event.touches[i].target;
        if (target.id === 'jump-button') jumpTouchActive = true;
        if (target.id === 'dash-button') dashTouchActive = true;
        if (target.id === 'scan-button') scanTouchActive = true;
    }
    
    if (!jumpTouchActive && touchControls.jumpButtonActive) {
        touchControls.jumpButtonActive = false;
        keys.jump = false;
    }
    
    if (!dashTouchActive && touchControls.dashButtonActive) {
        touchControls.dashButtonActive = false;
        keys.dash = false;
    }
    
    if (!scanTouchActive && touchControls.scanButtonActive) {
        touchControls.scanButtonActive = false;
        keys.scan = false;
    }
    
    // Check for look deactivation
    let lookTouchActive = false;
    for (let i = 0; i < event.touches.length; i++) {
        if (event.touches[i].target.id === 'look-area') {
            lookTouchActive = true;
            break;
        }
    }
    
    if (!lookTouchActive) {
        touchControls.lookActive = false;
    }
}

// Update joystick visual position
function updateJoystickPosition() {
    if (!touchControls.joystickActive) return;
    
    const joystickKnob = document.getElementById('joystick-knob');
    const maxDistance = 40; // Maximum distance the joystick can move
    
    // Calculate distance and angle
    const dx = touchControls.joystickPosition.x - touchControls.joystickOrigin.x;
    const dy = touchControls.joystickPosition.y - touchControls.joystickOrigin.y;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    
    // Calculate new position
    const newX = distance * Math.cos(angle);
    const newY = distance * Math.sin(angle);
    
    // Update joystick knob position
    joystickKnob.style.transform = `translate(${newX}px, ${newY}px)`;
}

// Update movement based on joystick position
function updateMovementFromJoystick() {
    if (!touchControls.joystickActive) return;
    
    const dx = touchControls.joystickPosition.x - touchControls.joystickOrigin.x;
    const dy = touchControls.joystickPosition.y - touchControls.joystickOrigin.y;
    const maxDistance = 40;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    
    // Only register movement if joystick moved far enough
    if (distance > 5) {
        // Normalize dx and dy to values between -1 and 1
        const normalizedX = dx / maxDistance;
        const normalizedY = dy / maxDistance;
        
        // Set movement keys based on joystick direction
        keys.forward = normalizedY < -0.3;
        keys.backward = normalizedY > 0.3;
        keys.left = normalizedX < -0.3;
        keys.right = normalizedX > 0.3;
    } else {
        // Reset keys if joystick is in neutral position
        keys.forward = false;
        keys.backward = false;
        keys.left = false;
        keys.right = false;
    }
}

// Reset joystick to center position
function resetJoystick() {
    const joystickKnob = document.getElementById('joystick-knob');
    joystickKnob.style.transform = 'translate(0, 0)';
    
    // Reset movement keys
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
}

// Update camera look from touch input
function updateLookFromTouch() {
    if (!touchControls.lookActive) return;
    
    const sensitivity = 0.1; // Adjust based on preference
    
    // Update player and camera rotation
    const playerObject = getPlayerObject();
    if (playerObject) {
        playerObject.rotation.y -= touchControls.lookDelta.x * 0.005 * sensitivity;
        
        // Limit up/down camera rotation
        const camera = window.camera;
        if (camera) {
            const verticalRotation = camera.rotation.x + touchControls.lookDelta.y * 0.005 * sensitivity;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, verticalRotation));
        }
    }
}

// Check if device has orientation support and initialize if available
function initDeviceOrientation() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
        return true;
    }
    return false;
}

// Handle device orientation changes
function handleDeviceOrientation(event) {
    if (!touchControls.active || touchControls.lookActive) return;
    
    const beta = event.beta; // X-axis rotation (-180 to 180)
    const gamma = event.gamma; // Y-axis rotation (-90 to 90)
    
    // Only use device orientation if we're not using touch look controls
    if (beta && gamma && !touchControls.lookActive) {
        const playerObject = getPlayerObject();
        const camera = window.camera;
        
        if (playerObject && camera) {
            // Apply orientation to camera look
            const sensitivity = 0.02;
            
            // Update player's horizontal orientation based on device rotation
            playerObject.rotation.y -= gamma * sensitivity;
            
            // Update camera's vertical orientation, with limits
            const verticalRotation = camera.rotation.x + beta * sensitivity;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, verticalRotation));
        }
    }
}

export { 
    touchControls, 
    initTouchControls, 
    initDeviceOrientation
};