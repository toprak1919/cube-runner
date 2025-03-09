import * as THREE from 'three';
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
    
    // Settings panel
    const settingsButton = document.getElementById('settings-button');
    const backButton = document.getElementById('back-button');
    const menuPanel = document.getElementById('menu');
    const settingsPanel = document.getElementById('settings-panel');
    
    // Volume control
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    // Quality selector
    const qualitySelector = document.getElementById('quality-selector');
    
    // Open settings
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            // Hide start button and show settings
            settingsButton.style.display = 'none';
            document.getElementById('start-button').style.display = 'none';
            settingsPanel.style.display = 'block';
        });
    }
    
    // Back to main menu
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Hide settings and show start buttons
            settingsPanel.style.display = 'none';
            settingsButton.style.display = 'inline-block';
            document.getElementById('start-button').style.display = 'inline-block';
        });
    }
    
    // Volume slider
    if (volumeSlider) {
        // Initialize with current value
        if (window.getVolume) {
            volumeSlider.value = window.getVolume() * 100;
            volumeValue.textContent = Math.round(window.getVolume() * 100) + '%';
        }
        
        volumeSlider.addEventListener('input', () => {
            const value = volumeSlider.value / 100;
            if (window.setVolume) {
                window.setVolume(value);
            }
            volumeValue.textContent = volumeSlider.value + '%';
        });
    }
    
    // Quality selector
    if (qualitySelector) {
        qualitySelector.addEventListener('change', () => {
            const quality = qualitySelector.value;
            setGraphicsQuality(quality);
        });
    }
}

// Set graphics quality
function setGraphicsQuality(quality) {
    switch (quality) {
        case 'low':
            if (window.renderer) {
                window.renderer.setPixelRatio(1);
                window.renderer.shadowMap.enabled = false;
            }
            break;
        case 'medium':
            if (window.renderer) {
                window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                window.renderer.shadowMap.enabled = !window.gameState.device.isMobile;
                window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            break;
        case 'high':
            if (window.renderer) {
                window.renderer.setPixelRatio(window.devicePixelRatio);
                window.renderer.shadowMap.enabled = true;
                window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            break;
    }
}

export { 
    updateEnergyBar, 
    updateScore, 
    updateCollectiblesCounter, 
    updateTimer, 
    updateDashCooldown, 
    showMessage,
    setupUIListeners,
    setGraphicsQuality
};