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

// Asset loader
function loadAssets(assets, onProgress, onComplete) {
    loadingState.assetsTotal = assets.length;
    loadingState.assetsLoaded = 0;
    loadingState.onComplete = onComplete;
    
    // If no assets to load, complete immediately
    if (assets.length === 0) {
        hideLoadingScreen();
        return;
    }
    
    // Track loaded assets
    let loaded = 0;
    
    // Load each asset
    assets.forEach(asset => {
        let element;
        
        if (asset.type === 'audio') {
            element = new Audio();
            element.src = asset.src;
            
            element.addEventListener('canplaythrough', () => {
                loaded++;
                loadingState.assetsLoaded = loaded;
                
                if (onProgress) {
                    onProgress(loaded, assets.length);
                }
                
                if (loaded === assets.length) {
                    hideLoadingScreen();
                }
            }, { once: true });
            
            // Handle errors
            element.addEventListener('error', () => {
                console.error(`Failed to load audio: ${asset.src}`);
                loaded++;
                
                if (onProgress) {
                    onProgress(loaded, assets.length);
                }
                
                if (loaded === assets.length) {
                    hideLoadingScreen();
                }
            });
            
            // Store in the asset object
            asset.element = element;
        } else if (asset.type === 'image') {
            element = new Image();
            element.src = asset.src;
            
            element.onload = () => {
                loaded++;
                loadingState.assetsLoaded = loaded;
                
                if (onProgress) {
                    onProgress(loaded, assets.length);
                }
                
                if (loaded === assets.length) {
                    hideLoadingScreen();
                }
            };
            
            element.onerror = () => {
                console.error(`Failed to load image: ${asset.src}`);
                loaded++;
                
                if (onProgress) {
                    onProgress(loaded, assets.length);
                }
                
                if (loaded === assets.length) {
                    hideLoadingScreen();
                }
            };
            
            // Store in the asset object
            asset.element = element;
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