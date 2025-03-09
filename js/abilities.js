import * as THREE from 'three';
import { gameState, keys, playSound } from './game-state.js';
import { 
    player, 
    getPlayerObject, 
    getLeftTrail, 
    getRightTrail 
} from './player.js';

// Activate dash ability
function activateDash() {
    if (gameState.playerAbilities.dash.cooldown > 0 || player.isDashing) return;
    
    // Play dash sound
    playSound('dash');
    
    // Calculate dash direction
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (keys.forward) moveDirection.z -= 1;
    if (keys.backward) moveDirection.z += 1;
    if (keys.left) moveDirection.x -= 1;
    if (keys.right) moveDirection.x += 1;
    
    // If no movement keys are pressed, dash forward
    if (moveDirection.length() === 0) {
        moveDirection.z -= 1;
    }
    
    moveDirection.normalize();
    moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), getPlayerObject().rotation.y);
    
    // Apply dash
    player.isDashing = true;
    player.dashDirection.copy(moveDirection);
    player.dashTimer = 10; // Duration in frames
    
    // Set cooldown
    gameState.playerAbilities.dash.cooldown = gameState.playerAbilities.dash.maxCooldown;
    
    // Visual effects
    getLeftTrail().visible = true;
    getRightTrail().visible = true;
    document.getElementById('boost-effect').style.opacity = 0.5;
    
    // Reduce energy
    gameState.energy = Math.max(0, gameState.energy - 10);
    window.updateEnergyBar();
}

// Activate scan ability
function activateScan() {
    if (gameState.playerAbilities.scan.cooldown > 0) return;
    
    // Play scan sound
    playSound('scan');
    
    // Set cooldown
    gameState.playerAbilities.scan.cooldown = gameState.playerAbilities.scan.maxCooldown;
    
    // Visual effect - pulse wave from player
    createScanPulseEffect();
    
    // Highlight collectibles within range
    window.scene.traverse((object) => {
        if (object.userData && object.userData.type === 'collectible' && !object.userData.collected) {
            const distance = object.position.distanceTo(getPlayerObject().position);
            
            if (distance < 50) {
                // Create path indicator to object
                createPathIndicator(object.position);
                
                // Highlight the object
                highlightObject(object);
            }
        }
    });
    
    // Reduce energy
    gameState.energy = Math.max(0, gameState.energy - 5);
    window.updateEnergyBar();
}

// Create scan pulse effect
function createScanPulseEffect() {
    const pulseGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
    const pulseMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.position.copy(getPlayerObject().position);
    pulse.rotation.x = Math.PI / 2; // Flat on ground
    window.scene.add(pulse);
    
    // Animation
    const pulseAnimation = {
        update: (delta) => {
            const growSpeed = 0.5 * delta;
            
            pulse.scale.x += growSpeed;
            pulse.scale.y += growSpeed;
            pulse.scale.z += growSpeed;
            
            pulse.position.y = getPlayerObject().position.y;
            
            pulseMaterial.opacity -= 0.02 * delta;
            
            if (pulseMaterial.opacity <= 0) {
                window.scene.remove(pulse);
                return true; // Animation complete
            }
            return false;
        }
    };
    
    window.animations.push(pulseAnimation);
}

// Create a path indicator to an object
function createPathIndicator(targetPosition) {
    // Create a line from player to object
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    const playerPosition = getPlayerObject().position;
    
    const points = [
        playerPosition.clone(),
        new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 0.5,
            playerPosition.z
        ),
        new THREE.Vector3(
            targetPosition.x,
            targetPosition.y + 0.5,
            targetPosition.z
        ),
        targetPosition.clone()
    ];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    window.scene.add(line);
    
    // Animation
    const lineAnimation = {
        timer: 0,
        maxTime: 60,
        update: (delta) => {
            lineAnimation.timer += delta;
            
            // Update start point to follow player
            const positions = line.geometry.attributes.position.array;
            const currentPlayerPosition = getPlayerObject().position;
            positions[0] = currentPlayerPosition.x;
            positions[1] = currentPlayerPosition.y;
            positions[2] = currentPlayerPosition.z;
            
            positions[3] = currentPlayerPosition.x;
            positions[4] = currentPlayerPosition.y + 0.5;
            positions[5] = currentPlayerPosition.z;
            
            line.geometry.attributes.position.needsUpdate = true;
            
            if (lineAnimation.timer > lineAnimation.maxTime) {
                lineMaterial.opacity -= 0.05 * delta;
                
                if (lineMaterial.opacity <= 0) {
                    window.scene.remove(line);
                    return true; // Animation complete
                }
            }
            return false;
        }
    };
    
    window.animations.push(lineAnimation);
}

// Highlight an object
function highlightObject(object) {
    // Create a pulsing highlight effect around the object
    const highlightGeometry = new THREE.SphereGeometry(1, 16, 16);
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.position.copy(object.position);
    highlight.scale.set(1.5, 1.5, 1.5);
    window.scene.add(highlight);
    
    // Animation
    const highlightAnimation = {
        timer: 0,
        maxTime: 120,
        phase: 0,
        update: (delta) => {
            highlightAnimation.timer += delta;
            highlightAnimation.phase += 0.05 * delta;
            
            // Pulsing effect
            const scale = 1.5 + Math.sin(highlightAnimation.phase) * 0.2;
            highlight.scale.set(scale, scale, scale);
            
            // Fade out after time
            if (highlightAnimation.timer > highlightAnimation.maxTime) {
                highlightMaterial.opacity -= 0.02 * delta;
                
                if (highlightMaterial.opacity <= 0) {
                    window.scene.remove(highlight);
                    return true; // Animation complete
                }
            }
            return false;
        }
    };
    
    window.animations.push(highlightAnimation);
}

export { activateDash, activateScan };