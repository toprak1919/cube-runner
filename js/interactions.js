import * as THREE from 'three';
import { gameState, playSound, victoryAchieved } from './game-state.js';
import { playerRadius, player, getPlayerObject } from './player.js';

// Detect interactions with collectibles and other interactive objects
function checkInteractions() {
    // Create bounding box for player with slightly larger size for interaction zone
    const interactionRadius = playerRadius * 2.5;
    const interactionGeometry = new THREE.SphereGeometry(interactionRadius, 8, 8);
    const interactionMesh = new THREE.Mesh(interactionGeometry);
    interactionMesh.position.copy(getPlayerObject().position);
    
    const interactionBox = new THREE.Box3().setFromObject(interactionMesh);
    
    window.scene.traverse((object) => {
        if (object.userData && object.userData.interactive && player.canInteract) {
            const objectBox = new THREE.Box3().setFromObject(object);
            
            if (interactionBox.intersectsBox(objectBox)) {
                // Handle different types of interactive objects
                if (object.userData.type === 'collectible') {
                    collectItem(object);
                } else if (object.userData.type === 'hazard') {
                    takeHazardDamage(object);
                } else if (object.userData.type === 'powerup') {
                    activatePowerup(object);
                } else if (object.userData.type === 'teleporter') {
                    teleportPlayer(object);
                }
            }
        }
    });
}

// Collect an item
function collectItem(item) {
    if (item.userData.collected) return;
    
    // Play collect sound
    playSound('collect');
    
    // Visual effect for collection
    createCollectEffect(item.position);
    
    // Update game state
    gameState.collectibles.collected++;
    gameState.score += item.userData.value || 100;
    item.userData.collected = true;
    
    // Hide the item
    item.visible = false;
    
    // Update UI
    window.updateCollectiblesCounter();
    window.updateScore();
    
    // Show message
    window.showMessage("Data core secured! " + 
                    (gameState.collectibles.total - gameState.collectibles.collected) + 
                    " remaining");
    
    // Check if all collectibles are collected
    if (gameState.collectibles.collected >= gameState.collectibles.total) {
        victoryAchieved();
    }
}

// Create a collection effect at position
function createCollectEffect(position) {
    // Particle effect
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = position.x;
        particlePositions[i3 + 1] = position.y;
        particlePositions[i3 + 2] = position.z;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.5,
        transparent: true,
        opacity: 1
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    window.scene.add(particles);
    
    // Animate particles outward
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
        velocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2 + 0.1,
            z: (Math.random() - 0.5) * 0.2
        });
    }
    
    // Add to animation system
    const particleAnimation = {
        update: (delta) => {
            let positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                positions[i3] += velocities[i].x * delta;
                positions[i3 + 1] += velocities[i].y * delta;
                positions[i3 + 2] += velocities[i].z * delta;
                
                velocities[i].y -= 0.001 * delta; // Gravity effect
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particleMaterial.opacity -= 0.01 * delta;
            
            if (particleMaterial.opacity <= 0) {
                window.scene.remove(particles);
                return true; // Animation complete
            }
            return false;
        }
    };
    
    window.animations.push(particleAnimation);
}

// Take damage from a hazard
function takeHazardDamage(hazard) {
    if (!player.canInteract) return;
    
    gameState.energy -= hazard.userData.damage || 10;
    window.updateEnergyBar();
    
    // Knockback effect
    const knockbackDirection = new THREE.Vector3().subVectors(
        getPlayerObject().position, hazard.position
    ).normalize();
    
    player.velocity.add(
        knockbackDirection.multiplyScalar(0.3)
    );
    
    // Temporary invulnerability
    player.canInteract = false;
    setTimeout(() => { player.canInteract = true; }, 500);
    
    // Camera shake effect
    createCameraShake(0.1, 200);
    
    // Check if player is out of energy
    if (gameState.energy <= 0) {
        window.gameOver();
    }
}

// Activate a powerup
function activatePowerup(powerup) {
    if (powerup.userData.collected) return;
    
    // Play powerup sound
    playSound('collect');
    
    // Apply powerup effect
    const type = powerup.userData.powerupType;
    
    if (type === 'energy') {
        gameState.energy = Math.min(100, gameState.energy + 25);
        window.updateEnergyBar();
        window.showMessage("Energy restored!");
    } else if (type === 'speed') {
        player.speed *= 1.5;
        setTimeout(() => { player.speed /= 1.5; }, 10000);
        window.showMessage("Speed boost activated!");
    } else if (type === 'jump') {
        player.jumpStrength *= 1.5;
        setTimeout(() => { player.jumpStrength /= 1.5; }, 10000);
        window.showMessage("Jump boost activated!");
    } else if (type === 'time') {
        gameState.timeRemaining += 30;
        window.updateTimer();
        window.showMessage("Time extended!");
    }
    
    // Hide the powerup
    powerup.userData.collected = true;
    powerup.visible = false;
    
    // Update score
    gameState.score += 50;
    window.updateScore();
}

// Teleport the player
function teleportPlayer(teleporter) {
    if (!teleporter.userData.destination) return;
    
    // Play teleport sound
    playSound('teleport');
    
    // Move the player
    getPlayerObject().position.copy(teleporter.userData.destination);
    
    // Show message
    window.showMessage("Teleported to new area");
}

// Camera shake effect
function createCameraShake(intensity, duration) {
    const originalPosition = window.camera.position.clone();
    
    const shakeAnimation = {
        timer: 0,
        maxTime: duration,
        update: (delta) => {
            shakeAnimation.timer += delta;
            
            if (shakeAnimation.timer < shakeAnimation.maxTime) {
                const decreaseFactor = 1 - (shakeAnimation.timer / shakeAnimation.maxTime);
                const currentIntensity = intensity * decreaseFactor;
                
                window.camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
                window.camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;
                window.camera.position.z = originalPosition.z + (Math.random() - 0.5) * currentIntensity;
                
                return false;
            } else {
                // Reset camera position
                window.camera.position.copy(originalPosition);
                return true; // Animation complete
            }
        }
    };
    
    window.animations.push(shakeAnimation);
}

export { checkInteractions };