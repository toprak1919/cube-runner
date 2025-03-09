import { gameState } from './game-state.js';

// Update UI elements
function updateEnergyBar() {
    const energyLevel = document.getElementById('energy-level');
    energyLevel.style.width = gameState.energy + '%';
}

function updateScore() {
    const scoreValue = document.getElementById('score-value');
    scoreValue.textContent = gameState.score;
}

function updateCollectiblesCounter() {
    const collectiblesCount = document.getElementById('collectibles-count');
    const collectiblesTotal = document.getElementById('collectibles-total');
    
    collectiblesCount.textContent = gameState.collectibles.collected;
    collectiblesTotal.textContent = gameState.collectibles.total;
}

function updateTimer() {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    const timeValue = document.getElementById('time-value');
    
    timeValue.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function updateDashCooldown() {
    const dashCooldown = document.getElementById('dash-cooldown');
    const cooldownPercent = (gameState.playerAbilities.dash.cooldown / gameState.playerAbilities.dash.maxCooldown) * 100;
    
    dashCooldown.style.height = cooldownPercent + '%';
}

// Show a message to the player
function showMessage(text, duration = 3000) {
    const messageBox = document.getElementById('message-box');
    messageBox.innerHTML = text;
    messageBox.style.opacity = 1;
    
    // Clear any existing timeout
    if (messageBox.timeout) {
        clearTimeout(messageBox.timeout);
    }
    
    // Hide after duration
    messageBox.timeout = setTimeout(() => {
        messageBox.style.opacity = 0;
    }, duration);
}

// Setup UI event listeners
function setupUIListeners(startGame, restartGame) {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
}

export { 
    updateEnergyBar, 
    updateScore, 
    updateCollectiblesCounter, 
    updateTimer, 
    updateDashCooldown, 
    showMessage,
    setupUIListeners
};