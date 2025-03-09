// Loading state management
const loadingState = {
    assetsLoaded: 0,
    assetsTotal: 0,
    loadingComplete: false,
    onComplete: null
};

// Initialize loading screen
function initLoadingScreen() {
    // Create loading screen element
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    
    // Add loading content
    loadingScreen.innerHTML = `
        <div class="loading-content">
            <h1>CUBE RUNNER: NEON DIMENSION</h1>
            <div class="loading-progress-container">
                <div id="loading-progress-bar"></div>
            </div>
            <div id="loading-text">Loading game assets...</div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(loadingScreen);
    
    return loadingScreen;
}

// Update loading progress
function updateLoadingProgress(loaded, total) {
    loadingState.assetsLoaded = loaded;
    loadingState.assetsTotal = total;
    
    const progressBar = document.getElementById('loading-progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar && loadingText) {
        const progress = Math.min(100, Math.round((loaded / total) * 100));
        progressBar.style.width = progress + '%';
        loadingText.textContent = `Loading game assets... ${progress}%`;
    }
}

// Hide loading screen and start game
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen) {
        // Add fade-out animation
        loadingScreen.classList.add('fade-out');
        
        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(loadingScreen);
            
            // Call the onComplete callback
            if (loadingState.onComplete) {
                loadingState.onComplete();
            }
        }, 1000);
    }
    
    loadingState.loadingComplete = true;
}

// Asset loader - modified to be more tolerant of missing files
function loadAssets(assets, onProgress, onComplete) {
    loadingState.assetsTotal = assets.length;
    loadingState.assetsLoaded = 0;
    loadingState.onComplete = onComplete;
    
    // If no assets to load, complete immediately
    if (assets.length === 0) {
        setTimeout(() => {
            hideLoadingScreen();
        }, 500);
        return;
    }
    
    // Track loaded assets
    let loaded = 0;
    
    // For each asset
    assets.forEach(asset => {
        // Use a timeout to simulate loading if we're having issues
        setTimeout(() => {
            loaded++;
            loadingState.assetsLoaded = loaded;
            
            if (onProgress) {
                onProgress(loaded, assets.length);
            }
            
            if (loaded === assets.length) {
                hideLoadingScreen();
            }
        }, 100); // Small delay to make loading screen visible
        
        // Try to load the actual asset if it exists
        try {
            let element;
            
            if (asset.type === 'audio') {
                try {
                    element = new Audio();
                    element.src = asset.src;
                    
                    // Store element in asset
                    asset.element = element;
                    
                    // Set up event listeners
                    element.addEventListener('canplaythrough', () => {
                        console.log(`Loaded audio: ${asset.id}`);
                    }, { once: true });
                    
                    element.addEventListener('error', (e) => {
                        console.warn(`Unable to load audio ${asset.id}: ${e.message}`);
                    });
                } catch (e) {
                    console.warn(`Error setting up audio ${asset.id}: ${e.message}`);
                }
            } else if (asset.type === 'image') {
                try {
                    element = new Image();
                    element.src = asset.src;
                    
                    // Store element in asset
                    asset.element = element;
                } catch (e) {
                    console.warn(`Error setting up image ${asset.id}: ${e.message}`);
                }
            }
        } catch (e) {
            console.warn(`Failed to load asset ${asset.id || 'unknown'}: ${e.message}`);
        }
    });
    
    return assets;
}

export {
    loadingState,
    initLoadingScreen,
    updateLoadingProgress,
    hideLoadingScreen,
    loadAssets
};