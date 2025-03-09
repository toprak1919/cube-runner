import * as THREE from 'three';
import { gameState, keys } from './game-state.js';

// Player dimensions
const playerHeight = 1.7;
const playerRadius = 0.3;

// Player physics properties
const player = {
    velocity: new THREE.Vector3(0, 0, 0),
    onGround: true,
    speed: 0.1,
    jumpStrength: 0.2,
    gravity: 0.01,
    friction: 0.92,
    midair: false,
    lastGroundPos: new THREE.Vector3(),
    dashSpeed: 0.5,
    isDashing: false,
    dashDirection: new THREE.Vector3(),
    dashTimer: 0,
    canInteract: true
};

// Create player object
let playerObject, playerBody, playerHead, leftTrail, rightTrail;

function createPlayer(scene, camera) {
    playerObject = new THREE.Group();
    scene.add(playerObject);
    playerObject.position.y = playerHeight;
    
    // More detailed player model with glowing elements
    playerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(playerRadius * 0.7, playerRadius, playerHeight * 0.7, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0x00aaff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        })
    );
    playerBody.position.y = -playerHeight * 0.5;
    playerObject.add(playerBody);
    
    // Add armor plates to player
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const armor = new THREE.Mesh(
            new THREE.BoxGeometry(playerRadius * 0.8, playerHeight * 0.4, playerRadius * 0.2),
            new THREE.MeshStandardMaterial({ 
                color: 0x0088cc,
                emissive: 0x003366,
                metalness: 0.9,
                roughness: 0.1
            })
        );
        armor.position.set(
            Math.sin(angle) * playerRadius * 0.8,
            -playerHeight * 0.3,
            Math.cos(angle) * playerRadius * 0.8
        );
        armor.rotation.y = angle;
        playerBody.add(armor);
    }
    
    // Add player head with glowing elements
    playerHead = new THREE.Mesh(
        new THREE.SphereGeometry(playerRadius * 0.6, 16, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ccff,
            emissive: 0x0088cc,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3
        })
    );
    playerHead.position.y = 0;
    playerObject.add(playerHead);
    
    // Add visor to player head
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(playerRadius * 1.1, playerRadius * 0.3, playerRadius * 0.2),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    visor.position.set(0, 0, playerRadius * 0.4);
    playerHead.add(visor);
    
    // Add energy trails at player's feet
    const trailGeometry = new THREE.ConeGeometry(playerRadius * 0.3, playerHeight * 0.5, 16);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    leftTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    leftTrail.position.set(-playerRadius * 0.5, -playerHeight * 0.6, 0);
    leftTrail.rotation.x = Math.PI;
    leftTrail.visible = false;
    playerBody.add(leftTrail);
    
    rightTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    rightTrail.position.set(playerRadius * 0.5, -playerHeight * 0.6, 0);
    rightTrail.rotation.x = Math.PI;
    rightTrail.visible = false;
    playerBody.add(rightTrail);
    
    // First person camera setup
    playerObject.add(camera);
    
    return playerObject;
}

// Check for collision with objects
function checkCollision(nextPosition, objects = null) {
    // Create bounding box for player
    const playerBoundingBox = new THREE.Box3().setFromObject(playerBody);
    
    let collision = false;
    let objectHit = null;
    
    const checkObjects = objects || window.scene.children;
    
    // Temporarily move player to check collision
    const originalPosition = playerObject.position.clone();
    playerObject.position.copy(nextPosition);
    playerBoundingBox.setFromObject(playerBody);
    
    // Check against all collidable objects
    checkObjects.forEach((object) => {
        if (object.userData && object.userData.collidable && !collision) {
            const objectBoundingBox = new THREE.Box3().setFromObject(object);
            
            if (playerBoundingBox.intersectsBox(objectBoundingBox)) {
                collision = true;
                objectHit = object;
            }
        }
    });
    
    // Move player back
    playerObject.position.copy(originalPosition);
    
    return { collision, objectHit };
}

// Setup player controls
function setupControls(renderer, camera) {
    let pointerLocked = false;
    
    renderer.domElement.addEventListener('click', () => {
        if (gameState.isPlaying && !pointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        pointerLocked = (document.pointerLockElement === renderer.domElement);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.exitPointerLock();
        }
        
        if (!gameState.isPlaying) return;
        
        switch (e.key.toLowerCase()) {
            case 'w': keys.forward = true; break;
            case 's': keys.backward = true; break;
            case 'a': keys.left = true; break;
            case 'd': keys.right = true; break;
            case ' ': keys.jump = true; break;
            case 'shift': keys.dash = true; break;
            case 'e': keys.scan = true; break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w': keys.forward = false; break;
            case 's': keys.backward = false; break;
            case 'a': keys.left = false; break;
            case 'd': keys.right = false; break;
            case ' ': keys.jump = false; break;
            case 'shift': keys.dash = false; break;
            case 'e': keys.scan = false; break;
        }
    });
    
    // Control movement with mouse
    document.addEventListener('mousemove', (e) => {
        if (pointerLocked) {
            // Rotate player based on mouse movement
            playerObject.rotation.y -= e.movementX * 0.002;
            
            // Limit up/down camera rotation
            const verticalRotation = camera.rotation.x + e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, verticalRotation));
        }
    });
    
    return { pointerLocked: () => pointerLocked };
}

// Expose objects needed by other modules
function getPlayerObject() { return playerObject; }
function getPlayerBody() { return playerBody; }
function getLeftTrail() { return leftTrail; }
function getRightTrail() { return rightTrail; }

export { 
    playerHeight, 
    playerRadius, 
    player, 
    createPlayer, 
    checkCollision, 
    setupControls,
    getPlayerObject,
    getPlayerBody,
    getLeftTrail,
    getRightTrail
};