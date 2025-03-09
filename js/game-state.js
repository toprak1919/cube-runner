// Game state module
const gameState = {
    isPlaying: false,
    score: 0,
    energy: 100,
    collectibles: {
        collected: 0,
        total: 0
    },
    timeRemaining: 180, // 3 minutes in seconds
    playerAbilities: {
        dash: {
            active: false,
            cooldown: 0,
            maxCooldown: 60 // frames
        },
        scan: {
            active: false,
            cooldown: 0,
            maxCooldown: 300 // frames
        }
    }
};

// Audio elements (will be created dynamically)
const audio = {
    background: null,
    jump: null,
    dash: null,
    collect: null,
    scan: null,
    win: null,
    lose: null
};

// Keyboard controls state
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    dash: false,
    scan: false
};

// Start the game
function startGame() {
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.energy = 100;
    gameState.timeRemaining = 180;
    gameState.collectibles.collected = 0;
    
    // Hide menu
    document.getElementById('menu').style.display = 'none';
    
    // Show timer
    document.getElementById('timer').style.display = 'block';
    
    // Start timer
    startGameTimer();
    
    // Show welcome message
    window.showMessage("Welcome to CUBE RUNNER! Collect all data cores before time runs out.", 5000);
}

// Start game timer
function startGameTimer() {
    const timerInterval = setInterval(() => {
        if (!gameState.isPlaying) {
            clearInterval(timerInterval);
            return;
        }
        
        gameState.timeRemaining--;
        window.updateTimer();
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            gameOver();
        }
    }, 1000);
}

// Game over
function gameOver() {
    gameState.isPlaying = false;
    
    // Show game over screen
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('final-score').textContent = gameState.score;
    
    // Release pointer lock
    document.exitPointerLock();
}

// Victory achieved
function victoryAchieved() {
    // Add victory bonus
    const timeBonus = gameState.timeRemaining * 10;
    gameState.score += timeBonus;
    
    window.showMessage("DIMENSION STABILIZED! Time Bonus: " + timeBonus, 5000);
    
    // Show victory screen (use same screen with different message)
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('game-over').querySelector('h1').textContent = "DIMENSION STABILIZED";
    document.getElementById('game-over').querySelector('h1').style.color = "#00ffff";
    document.getElementById('game-over').querySelector('h1').style.textShadow = "0 0 20px #00ffff";
    document.getElementById('final-score').textContent = gameState.score;
    
    // Release pointer lock
    document.exitPointerLock();
    
    gameState.isPlaying = false;
}

// Restart the game
function restartGame() {
    // Reset collectibles
    window.scene.traverse((object) => {
        if (object.userData && object.userData.type === 'collectible') {
            object.userData.collected = false;
            object.visible = true;
        }
        
        if (object.userData && object.userData.type === 'powerup') {
            object.userData.collected = false;
            object.visible = true;
        }
    });
    
    // Reset game state
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.energy = 100;
    gameState.timeRemaining = 180;
    gameState.collectibles.collected = 0;
    
    // Reset player position
    window.playerObject.position.set(0, window.playerHeight, 0);
    window.playerObject.rotation.y = 0;
    window.camera.rotation.x = 0;
    window.player.velocity.set(0, 0, 0);
    
    // Update UI
    window.updateEnergyBar();
    window.updateScore();
    window.updateCollectiblesCounter();
    window.updateTimer();
    
    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';
    
    // Show timer
    document.getElementById('timer').style.display = 'block';
    
    // Request pointer lock
    window.renderer.domElement.requestPointerLock();
    
    // Start timer
    startGameTimer();
    
    // Show restart message
    window.showMessage("Dimension reset. Collect all data cores!", 3000);
}

// Play a sound effect
function playSound(sound) {
    if (!audio[sound]) return;
    
    // Clone and play to allow overlapping sounds
    const soundClone = audio[sound].cloneNode();
    soundClone.volume = 0.5;
    soundClone.play();
}

export { 
    gameState, 
    keys, 
    audio, 
    startGame, 
    gameOver, 
    victoryAchieved, 
    restartGame, 
    playSound 
};