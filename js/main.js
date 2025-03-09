import * as THREE from 'three';
import { gameState, keys, startGame, gameOver, restartGame } from './game-state.js';
import { 
    player, 
    playerHeight, 
    createPlayer, 
    checkCollision, 
    setupControls,
    getPlayerObject,
    getLeftTrail,
    getRightTrail
} from './player.js';
import { activateDash, activateScan } from './abilities.js';
import { checkInteractions } from './interactions.js';
import { 
    updateEnergyBar, 
    updateScore, 
    updateCollectiblesCounter, 
    updateTimer, 
    updateDashCooldown, 
    showMessage,
    setupUIListeners
} from './ui.js';
import { 
    initTouchControls, 
    initDeviceOrientation
} from './touch-controls.js';
import { 
    initScene, 
    setupLighting, 
    createGround, 
    generateGameWorld
} from './world.js';
import { updateChunks } from './world-generator.js';
import {
    loadingState,
    initLoadingScreen,
    updateLoadingProgress,
    loadAssets
} from './loading.js';
import {
    initAudio,
    getAudioAssets,
    setupAudio,
    playSound,
    playBackgroundMusic,
    playMenuMusic,
    stopBackgroundMusic,
    stopMenuMusic,
    setVolume,
    getVolume
} from './audio.js';

// Global objects that need to be accessible across modules
window.scene = null;
window.camera = null;
window.renderer = null;
window.animations = [];
window.playerObject = null;
window.player = player;
window.playerHeight = playerHeight;

// UI functions that need to be accessible globally
window.updateEnergyBar = updateEnergyBar;
window.updateScore = updateScore;
window.updateCollectiblesCounter = updateCollectiblesCounter;
window.updateTimer = updateTimer;
window.updateDashCooldown = updateDashCooldown;
window.showMessage = showMessage;
window.gameOver = gameOver;

// Audio functions that need to be accessible globally
window.playSound = playSound;
window.playBackgroundMusic = playBackgroundMusic;
window.playMenuMusic = playMenuMusic;
window.stopBackgroundMusic = stopBackgroundMusic;
window.stopMenuMusic = stopMenuMusic;
window.setVolume = setVolume;
window.getVolume = getVolume;

// Initialize game
function init() {
    // Show loading screen
    initLoadingScreen();
    
    // Initialize audio system
    initAudio();
    
    // Get audio assets to load
    const audioAssets = getAudioAssets();
    
    // Load all assets with error handling
    try {
        loadAssets(audioAssets, updateLoadingProgress, () => {
            // Assets loaded, now initialize the game
            try {
                setupAudio(audioAssets);
            } catch (e) {
                console.warn("Error setting up audio:", e);
            }
            initGameAfterLoading();
        });
    } catch (e) {
        console.error("Error in asset loading:", e);
        // Continue anyway for testing
        initGameAfterLoading();
    }
}

// Initialize game after assets are loaded
function initGameAfterLoading() {
    try {
        // Initialize scene, camera, and renderer
        const { scene: newScene, camera: newCamera, renderer: newRenderer } = initScene();
        window.scene = newScene;
        window.camera = newCamera;
        window.renderer = newRenderer;
    
    // Set up lighting
    setupLighting(window.scene);
    
    // Create ground
    createGround(window.scene);
    
    // Create player
    window.playerObject = createPlayer(window.scene, window.camera);
    
    // Set up controls
    const controls = setupControls(window.renderer, window.camera);
    
    // Set up UI event listeners
    setupUIListeners(startGame, restartGame);
    
    // Set up touch controls for mobile devices
    initTouchControls();
    
    // Initialize device orientation if available
    initDeviceOrientation();
    
    // Generate the game world
    generateGameWorld(window.scene);
    
    // Initialize UI
    updateEnergyBar();
    updateScore();
    updateCollectiblesCounter();
    updateTimer();
    
    // Handle window resizing
    window.addEventListener('resize', handleWindowResize);
    
    // Play menu music
    playMenuMusic();
    
        // Start animation loop
        animate();
    } catch (e) {
        console.error("Error initializing game:", e);
        // Show error message to user
        document.getElementById('loading-screen')?.remove();
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.innerHTML = `
            <h2>Sorry, there was an error initializing the game</h2>
            <p>Your browser may not support all required features.</p>
            <p>Try using a modern browser like Chrome, Firefox, or Edge.</p>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0,10,32,0.9);
            color: #0cf;
            padding: 30px;
            border: 2px solid #f00;
            border-radius: 10px;
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 9999;
        `;
        document.body.appendChild(errorDiv);
    }
}

// Handle window resize to maintain aspect ratio
function handleWindowResize() {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Check if player is approaching chunk boundary and load new chunks
function updateWorldChunks() {
    if (window.playerObject && window.scene) {
        updateChunks(window.scene, window.playerObject.position);
    }
}

// Main game loop
let previousTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    
    // Calculate delta time for consistent movement
    const currentTime = performance.now();
    const deltaTime = (currentTime - previousTime) / 16.667; // Normalize to ~60fps
    previousTime = currentTime;
    
    if (gameState.isPlaying) {
        // Update world chunks based on player position
        updateWorldChunks();
        
        // Handle player movement
        if (document.pointerLockElement === window.renderer.domElement) {
            // Calculate movement direction based on camera rotation
            const moveDirection = new THREE.Vector3(0, 0, 0);
            
            if (keys.forward) moveDirection.z -= 1;
            if (keys.backward) moveDirection.z += 1;
            if (keys.left) moveDirection.x -= 1;
            if (keys.right) moveDirection.x += 1;
            
            if (moveDirection.length() > 0) {
                moveDirection.normalize();
                
                // Adjust direction relative to player rotation
                moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), window.playerObject.rotation.y);
                
                // Apply movement
                player.velocity.x += moveDirection.x * player.speed * deltaTime;
                player.velocity.z += moveDirection.z * player.speed * deltaTime;
            }
            
            // Handle jumping
            if (keys.jump && player.onGround) {
                player.velocity.y = player.jumpStrength * deltaTime;
                player.onGround = false;
            }
            
            // Handle abilities
            if (keys.dash && !player.isDashing && gameState.playerAbilities.dash.cooldown <= 0) {
                activateDash();
            }
            
            if (keys.scan && gameState.playerAbilities.scan.cooldown <= 0) {
                activateScan();
            }
            
            // Apply dash
            if (player.isDashing) {
                player.velocity.x = player.dashDirection.x * player.dashSpeed;
                player.velocity.z = player.dashDirection.z * player.dashSpeed;
                
                player.dashTimer -= deltaTime;
                
                if (player.dashTimer <= 0) {
                    player.isDashing = false;
                    getLeftTrail().visible = false;
                    getRightTrail().visible = false;
                    document.getElementById('boost-effect').style.opacity = 0;
                }
            }
            
            // Apply gravity
            if (!player.onGround) {
                player.velocity.y -= player.gravity * deltaTime;
            }
            
            // Check ground collision
            if (window.playerObject.position.y < playerHeight) {
                window.playerObject.position.y = playerHeight;
                player.velocity.y = 0;
                player.onGround = true;
            }
            
            // Apply friction
            player.velocity.x *= player.friction;
            player.velocity.z *= player.friction;
            
            // Calculate next position
            const nextPosition = window.playerObject.position.clone();
            nextPosition.x += player.velocity.x;
            nextPosition.z += player.velocity.z;
            
            // Check collision with other objects
            if (!checkCollision(nextPosition).collision) {
                window.playerObject.position.x += player.velocity.x;
                window.playerObject.position.z += player.velocity.z;
            }
            
            // Apply vertical movement
            window.playerObject.position.y += player.velocity.y;
            
            // Check for interactions
            checkInteractions();
        }
        
        // Update ability cooldowns
        if (gameState.playerAbilities.dash.cooldown > 0) {
            gameState.playerAbilities.dash.cooldown -= deltaTime;
            updateDashCooldown();
        }
        
        if (gameState.playerAbilities.scan.cooldown > 0) {
            gameState.playerAbilities.scan.cooldown -= deltaTime;
        }
        
        // Regenerate energy slowly
        if (gameState.energy < 100) {
            gameState.energy = Math.min(100, gameState.energy + 0.03 * deltaTime);
            updateEnergyBar();
        }
    }
    
    // Update animations
    for (let i = window.animations.length - 1; i >= 0; i--) {
        const animation = window.animations[i];
        const completed = animation.update(deltaTime);
        
        if (completed) {
            window.animations.splice(i, 1);
        }
    }
    
    // Render scene
    window.renderer.render(window.scene, window.camera);
}

// Initialize the game when the page loads
init();