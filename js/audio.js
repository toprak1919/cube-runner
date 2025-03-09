import { gameState } from './game-state.js';

// Game audio management
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let masterGainNode;

// Audio elements
const audioElements = {
    // Sound effects
    jump: null,
    dash: null,
    collect: null,
    scan: null,
    teleport: null,
    win: null,
    lose: null,
    menu: null,
    
    // Music
    background: null
};

// Initialize audio system
function initAudio() {
    try {
        // Create master gain node for volume control
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.5; // Default volume
        masterGainNode.connect(audioContext.destination);
        
        // Resume AudioContext if it's suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            const resumeAudio = function() {
                audioContext.resume();
                
                // Remove event listeners once audio is resumed
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('touchstart', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
            };
            
            document.addEventListener('click', resumeAudio);
            document.addEventListener('touchstart', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        }
        
        return true;
    } catch (e) {
        console.error('Audio initialization failed:', e);
        return false;
    }
}

// Load audio assets
function getAudioAssets() {
    return [
        { type: 'audio', id: 'jump', src: './assets/audio/jump.mp3' },
        { type: 'audio', id: 'dash', src: './assets/audio/dash.mp3' },
        { type: 'audio', id: 'collect', src: './assets/audio/collect.mp3' },
        { type: 'audio', id: 'scan', src: './assets/audio/scan.mp3' },
        { type: 'audio', id: 'teleport', src: './assets/audio/teleport.mp3' },
        { type: 'audio', id: 'win', src: './assets/audio/win.mp3' },
        { type: 'audio', id: 'lose', src: './assets/audio/lose.mp3' },
        { type: 'audio', id: 'menu', src: './assets/audio/menu.mp3' },
        { type: 'audio', id: 'background', src: './assets/audio/background.mp3' }
    ];
}

// Set up audio after loading
function setupAudio(loadedAssets) {
    loadedAssets.forEach(asset => {
        if (asset.type === 'audio') {
            audioElements[asset.id] = asset.element;
        }
    });
    
    // Configure background music
    if (audioElements.background) {
        audioElements.background.loop = true;
        audioElements.background.volume = 0.3;
    }
    
    // Configure menu music
    if (audioElements.menu) {
        audioElements.menu.loop = true;
        audioElements.menu.volume = 0.3;
    }
}

// Play sound with optional parameters
function playSound(id, options = {}) {
    // Default options
    const settings = {
        volume: 1.0,
        loop: false,
        rate: 1.0,
        ...options
    };
    
    // Check if sound exists
    if (!audioElements[id]) {
        console.warn(`Sound not found: ${id}`);
        return null;
    }
    
    try {
        // Clone the audio element to allow overlapping sounds
        const sound = audioElements[id].cloneNode();
        
        // Apply settings
        sound.volume = settings.volume * masterGainNode.gain.value;
        sound.loop = settings.loop;
        sound.playbackRate = settings.rate;
        
        // Play the sound
        sound.play().catch(e => {
            console.warn(`Error playing sound ${id}:`, e);
        });
        
        return sound;
    } catch (e) {
        console.error(`Error playing sound ${id}:`, e);
        return null;
    }
}

// Play background music
function playBackgroundMusic() {
    if (audioElements.background) {
        audioElements.background.currentTime = 0;
        audioElements.background.play().catch(e => {
            console.warn('Error playing background music:', e);
        });
    }
}

// Play menu music
function playMenuMusic() {
    if (audioElements.menu) {
        audioElements.menu.currentTime = 0;
        audioElements.menu.play().catch(e => {
            console.warn('Error playing menu music:', e);
        });
    }
}

// Stop background music
function stopBackgroundMusic() {
    if (audioElements.background && !audioElements.background.paused) {
        audioElements.background.pause();
        audioElements.background.currentTime = 0;
    }
}

// Stop menu music
function stopMenuMusic() {
    if (audioElements.menu && !audioElements.menu.paused) {
        audioElements.menu.pause();
        audioElements.menu.currentTime = 0;
    }
}

// Set master volume
function setVolume(volume) {
    if (masterGainNode) {
        masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
}

// Get current volume
function getVolume() {
    return masterGainNode ? masterGainNode.gain.value : 0;
}

export {
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
};