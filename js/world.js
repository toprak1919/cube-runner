import * as THREE from 'three';
import { gameState, isMobile } from './game-state.js';

// Generate futuristic structures for the game world
function generateGameWorld(scene) {
    // Create different zones with unique architectural styles
    createCentralHub(scene);
    createDataTowers(scene);
    createScienceLabZone(scene);
    createPowerCoreZone(scene);
    createObstacleZone(scene);
    
    // Add collectible data cores
    placeCollectibles(scene);
    
    // Add powerups
    placePowerups(scene);
    
    // Create skybox
    createSkybox(scene);
}

// Initialize scene, camera, and renderer
function initScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000a20, 0.015);
    scene.background = new THREE.Color(0x000a20);

    // First-person camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 0);
    
    // Optimize renderer settings based on device capabilities
    const rendererSettings = { 
        antialias: !gameState.device.isMobile, 
        powerPreference: 'high-performance'
    };
    
    const renderer = new THREE.WebGLRenderer(rendererSettings);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    
    // Only enable shadows on high-performance devices
    if (!gameState.device.isMobile) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    document.body.appendChild(renderer.domElement);

    return { scene, camera, renderer };
}

// Setup lighting
function setupLighting(scene) {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0x3366ff, 0.8);
    directionalLight.position.set(10, 20, 15);
    
    // Only enable shadow mapping on desktop devices
    if (!gameState.device.isMobile) {
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
    }
    scene.add(directionalLight);
    
    // Point lights for futuristic feel - reduce count on mobile
    const lightColors = [0x00ffff, 0x0088ff, 0xff00ff, 0x00ff88];
    const lightCount = gameState.device.isMobile ? 3 : 6;
    
    for (let i = 0; i < lightCount; i++) {
        const pointLight = new THREE.PointLight(lightColors[i % lightColors.length], 0.6, 20);
        pointLight.position.set(
            Math.sin(i * Math.PI / (lightCount / 2)) * 15, 
            3 + Math.random() * 5, 
            Math.cos(i * Math.PI / (lightCount / 2)) * 15
        );
        scene.add(pointLight);
        
        // Add a small glowing sphere at each light - simplified on mobile
        const sphereDetail = gameState.device.isMobile ? 8 : 16;
        const lightSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, sphereDetail, sphereDetail),
            new THREE.MeshBasicMaterial({ color: lightColors[i % lightColors.length] })
        );
        lightSphere.position.copy(pointLight.position);
        scene.add(lightSphere);
    }
}

// Create ground
function createGround(scene) {
    const groundSize = 200;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a14,
        metalness: 0.7,
        roughness: 0.3,
        wireframe: false
    });
    
    // Add terrain features to the ground
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Don't modify center area for player movement
        const x = vertices[i];
        const z = vertices[i + 2];
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        if (distFromCenter > 10) {
            // Create more interesting terrain with multiple sine waves
            vertices[i + 1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3 + 
                            Math.sin(x * 0.1 + z * 0.1) * 2 +
                            (Math.random() * 0.5);
            
            // Make mountains at the edges
            if (distFromCenter > groundSize * 0.4) {
                const edgeFactor = (distFromCenter - groundSize * 0.4) / (groundSize * 0.1);
                vertices[i + 1] += edgeFactor * 20;
            }
        }
    }
    
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grid lines on the ground for futuristic effect - more detailed
    const gridHelper = new THREE.GridHelper(groundSize, groundSize / 2, 0x0066ff, 0x001133);
    gridHelper.position.y = 0.1;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Add a second grid for more visual interest
    const gridHelper2 = new THREE.GridHelper(groundSize * 0.5, 50, 0x00aaff, 0x001133);
    gridHelper2.position.y = 0.15;
    gridHelper2.material.opacity = 0.5;
    gridHelper2.material.transparent = true;
    gridHelper2.rotation.y = Math.PI / 4; // Rotated for diamond pattern
    scene.add(gridHelper2);
}

// Create a central hub area
function createCentralHub(scene) {
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, 0, 0);
    scene.add(hubGroup);
    
    // Central platform
    const platformGeometry = new THREE.CylinderGeometry(8, 10, 1, 16);
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x0055aa,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x003366
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.5;
    platform.receiveShadow = true;
    hubGroup.add(platform);
    
    // Add decorative elements to the platform
    const ringGeometry = new THREE.TorusGeometry(9, 0.2, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.6;
    hubGroup.add(ring);
    
    // Central holographic projector
    const projectorBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1.5, 0.5, 8),
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.1
        })
    );
    projectorBase.position.y = 1;
    hubGroup.add(projectorBase);
    
    // Holographic effect
    const holoGeometry = new THREE.SphereGeometry(2, 16, 16);
    const holoMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    
    const hologram = new THREE.Mesh(holoGeometry, holoMaterial);
    hologram.position.y = 3;
    hubGroup.add(hologram);
    
    // Add animation to hologram
    const holoAnimation = {
        phase: 0,
        update: (delta) => {
            holoAnimation.phase += 0.02 * delta;
            
            hologram.rotation.y += 0.01 * delta;
            
            // Pulsing effect
            const scale = 1 + Math.sin(holoAnimation.phase) * 0.1;
            hologram.scale.set(scale, scale, scale);
            
            // Change opacity
            holoMaterial.opacity = 0.2 + Math.sin(holoAnimation.phase * 0.5) * 0.1;
            
            return false; // Animation continues
        }
    };
    
    window.animations.push(holoAnimation);
    
    // Add pillars around platform
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 8;
        
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 4, 1),
            new THREE.MeshStandardMaterial({
                color: 0x0066aa,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x003366
            })
        );
        
        pillar.position.set(
            Math.sin(angle) * radius,
            2,
            Math.cos(angle) * radius
        );
        
        pillar.castShadow = true;
        hubGroup.add(pillar);
        
        // Add light on top of pillar
        const light = new THREE.PointLight(0x00aaff, 0.5, 10);
        light.position.set(0, 2.5, 0);
        pillar.add(light);
        
        // Add glowing orb
        const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00aaff })
        );
        orb.position.y = 2.5;
        pillar.add(orb);
    }
}

// Create data tower structures
function createDataTowers(scene) {
    // Create data towers at different locations
    const towerLocations = [
        { x: 30, z: 30 },
        { x: -30, z: 30 },
        { x: 30, z: -30 },
        { x: -30, z: -30 }
    ];
    
    towerLocations.forEach((location, index) => {
        createDataTower(scene, location.x, location.z, index);
    });
}

// Create a single data tower
function createDataTower(scene, x, z, index) {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(x, 0, z);
    scene.add(towerGroup);
    
    // Base platform
    const baseGeometry = new THREE.BoxGeometry(10, 1, 10);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x0044aa,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    towerGroup.add(base);
    
    // Vertical tower
    const height = 20 + index * 5;
    const segmentHeight = 2;
    const segments = Math.floor(height / segmentHeight);
    
    for (let i = 0; i < segments; i++) {
        const segmentSize = 4 - (i / segments) * 2;
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(segmentSize, segmentHeight, segmentSize),
            new THREE.MeshStandardMaterial({
                color: 0x0066cc,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x003366,
                emissiveIntensity: i / segments
            })
        );
        
        segment.position.y = 1 + i * segmentHeight + segmentHeight / 2;
        segment.castShadow = true;
        segment.receiveShadow = true;
        towerGroup.add(segment);
        
        // Add emissive bands at segment junctions
        if (i < segments - 1) {
            const band = new THREE.Mesh(
                new THREE.BoxGeometry(segmentSize + 0.5, 0.1, segmentSize + 0.5),
                new THREE.MeshBasicMaterial({ color: 0x00aaff })
            );
            band.position.y = 1 + (i + 1) * segmentHeight;
            towerGroup.add(band);
        }
    }
    
    // Top element
    const topGeometry = new THREE.SphereGeometry(2, 16, 16);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        metalness: 0.5,
        roughness: 0.1,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5
    });
    
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1 + height;
    towerGroup.add(top);
    
    // Energy beam from top
    const beamGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = 5;
    top.add(beam);
    
    // Rotating elements
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3, 0.2, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0x00aaff })
    );
    ring.position.y = 1 + height;
    towerGroup.add(ring);
    
    // Animation for ring
    const ringAnimation = {
        update: (delta) => {
            ring.rotation.z += 0.01 * delta;
            ring.rotation.x += 0.005 * delta;
            return false; // Animation continues
        }
    };
    
    window.animations.push(ringAnimation);
}

// Create science lab zone
function createScienceLabZone(scene) {
    const labGroup = new THREE.Group();
    labGroup.position.set(40, 0, 0);
    scene.add(labGroup);
    
    // Main structure
    const mainStructure = new THREE.Mesh(
        new THREE.BoxGeometry(16, 6, 12),
        new THREE.MeshStandardMaterial({
            color: 0x0055aa,
            metalness: 0.6,
            roughness: 0.4
        })
    );
    mainStructure.position.y = 3;
    mainStructure.castShadow = true;
    mainStructure.receiveShadow = true;
    labGroup.add(mainStructure);
    
    // Add windows
    for (let i = 0; i < 6; i++) {
        const window = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1),
            new THREE.MeshBasicMaterial({
                color: 0x00ccff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        
        window.position.set(
            -7 + i * 2.5,
            3.5,
            6.01
        );
        window.rotation.y = Math.PI;
        labGroup.add(window);
        
        // Clone for back side
        const windowBack = window.clone();
        windowBack.position.z = -6.01;
        windowBack.rotation.y = 0;
        labGroup.add(windowBack);
    }
    
    // Add a dome structure
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
            color: 0x0077cc,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true,
            opacity: 0.7
        })
    );
    dome.position.set(0, 6, 0);
    labGroup.add(dome);
}

// Create power core zone
function createPowerCoreZone(scene) {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0, 40);
    scene.add(coreGroup);
    
    // Base platform
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(12, 12, 1, 16),
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.1
        })
    );
    base.position.y = 0.5;
    coreGroup.add(base);
    
    // Add glowing lines on base
    const lineGeometry = new THREE.TorusGeometry(10, 0.1, 8, 64);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = Math.PI / 2;
    line.position.y = 0.6;
    coreGroup.add(line);
    
    // Central power core
    const coreGeometry = new THREE.CylinderGeometry(2, 2, 15, 16);
    const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        metalness: 0.5,
        roughness: 0.5,
        emissive: 0x770077,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 8;
    coreGroup.add(core);
    
    // Energy field around core
    const fieldGeometry = new THREE.SphereGeometry(3, 32, 32);
    const fieldMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.position.y = 8;
    field.scale.y = 3;
    coreGroup.add(field);
    
    // Animation for field
    const fieldAnim = {
        phase: 0,
        update: (delta) => {
            fieldAnim.phase += 0.01 * delta;
            
            field.rotation.y += 0.01 * delta;
            field.rotation.z += 0.005 * delta;
            
            // Pulsing effect
            const pulseScale = 1 + Math.sin(fieldAnim.phase) * 0.1;
            field.scale.set(pulseScale, pulseScale * 3, pulseScale);
            
            // Change material
            coreMaterial.emissiveIntensity = 0.5 + Math.sin(fieldAnim.phase) * 0.2;
            
            return false;
        }
    };
    
    window.animations.push(fieldAnim);
}

// Create obstacle zone with moving platforms
function createObstacleZone(scene) {
    const obstacleGroup = new THREE.Group();
    obstacleGroup.position.set(-40, 0, 0);
    scene.add(obstacleGroup);
    
    // Base platform
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(30, 1, 30),
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.8,
            roughness: 0.2
        })
    );
    base.position.y = 0.5;
    obstacleGroup.add(base);
    
    // Add grid pattern
    const gridGeometry = new THREE.PlaneGeometry(30, 30, 30, 30);
    const gridMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    grid.position.y = 0.6;
    obstacleGroup.add(grid);
    
    // Create moving platforms
    const platformPositions = [
        { x: -10, z: -10 },
        { x: 0, z: -5 },
        { x: 10, z: -10 },
        { x: -10, z: 0 },
        { x: 10, z: 0 },
        { x: -10, z: 10 },
        { x: 0, z: 5 },
        { x: 10, z: 10 }
    ];
    
    platformPositions.forEach((pos, index) => {
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.5, 4),
            new THREE.MeshStandardMaterial({
                color: 0x00cc00,
                metalness: 0.5,
                roughness: 0.5,
                emissive: 0x005500
            })
        );
        
        platform.position.set(pos.x, 1, pos.z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        obstacleGroup.add(platform);
        
        // Add platform animation
        const moveDirection = index % 2 === 0 ? 'vertical' : 'horizontal';
        const moveDistance = 2 + index % 3;
        const moveSpeed = 0.02 + (index % 5) * 0.005;
        
        const platformAnim = {
            phase: Math.random() * Math.PI * 2,
            update: (delta) => {
                platformAnim.phase += moveSpeed * delta;
                
                if (moveDirection === 'vertical') {
                    platform.position.y = 1 + Math.sin(platformAnim.phase) * moveDistance;
                } else {
                    platform.position.x = pos.x + Math.sin(platformAnim.phase) * moveDistance;
                    platform.position.z = pos.z + Math.cos(platformAnim.phase) * moveDistance;
                }
                
                // Update user data for collision
                platform.userData.collidable = true;
                
                return false;
            }
        };
        
        window.animations.push(platformAnim);
    });
}

// Place collectible data cores throughout the world
function placeCollectibles(scene) {
    const collectibleGeometry = new THREE.OctahedronGeometry(0.8, 0);
    const collectibleMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        metalness: 0.7,
        roughness: 0.2,
        emissive: 0x00aaff,
        emissiveIntensity: 0.5
    });
    
    // Locations for collectibles
    const locations = [
        // Central hub
        { x: 0, y: 4, z: 0 },
        
        // Data towers
        { x: 30, y: 25, z: 30 },
        { x: -30, y: 30, z: 30 },
        { x: 30, y: 28, z: -30 },
        { x: -30, y: 22, z: -30 },
        
        // Science lab
        { x: 40, y: 9, z: 0 },
        
        // Power core
        { x: 0, y: 18, z: 40 },
        
        // Obstacle zone
        { x: -40, y: 6, z: 0 },
        
        // Other locations
        { x: 15, y: 2, z: 15 },
        { x: -15, y: 2, z: -15 },
        { x: 15, y: 2, z: -15 },
        { x: -15, y: 2, z: 15 }
    ];
    
    // Create all collectibles
    locations.forEach((loc) => {
        const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
        collectible.position.set(loc.x, loc.y, loc.z);
        collectible.castShadow = true;
        scene.add(collectible);
        
        // Animation for rotation and bobbing
        const collectibleAnim = {
            phase: Math.random() * Math.PI * 2,
            update: (delta) => {
                collectibleAnim.phase += 0.03 * delta;
                
                collectible.rotation.y += 0.02 * delta;
                collectible.position.y = loc.y + Math.sin(collectibleAnim.phase) * 0.2;
                
                return collectible.userData.collected;
            }
        };
        
        window.animations.push(collectibleAnim);
        
        // Add glow effect around collectible
        const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        collectible.add(glow);
        
        // Mark as collectible for interaction
        collectible.userData = {
            type: 'collectible',
            interactive: true,
            collected: false,
            value: 100
        };
        
        // Increment total collectibles counter
        gameState.collectibles.total++;
    });
    
    // Update UI
    window.updateCollectiblesCounter();
}

// Place powerups throughout the world
function placePowerups(scene) {
    // Powerup configurations
    const powerupTypes = [
        { type: 'energy', color: 0x00ffff, model: 'cube' },
        { type: 'speed', color: 0x00ff00, model: 'sphere' },
        { type: 'jump', color: 0xffff00, model: 'tetrahedron' },
        { type: 'time', color: 0xff00ff, model: 'torus' }
    ];
    
    // Locations for powerups
    const locations = [
        { x: 10, y: 1.5, z: 10 },
        { x: -10, y: 1.5, z: 10 },
        { x: 10, y: 1.5, z: -10 },
        { x: -10, y: 1.5, z: -10 }
    ];
    
    // Create powerups
    locations.forEach((loc, index) => {
        const powerupType = powerupTypes[index % powerupTypes.length];
        let powerupGeometry;
        
        // Choose geometry based on type
        switch (powerupType.model) {
            case 'cube':
                powerupGeometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                powerupGeometry = new THREE.SphereGeometry(0.6, 16, 16);
                break;
            case 'tetrahedron':
                powerupGeometry = new THREE.TetrahedronGeometry(0.8);
                break;
            case 'torus':
                powerupGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                break;
            default:
                powerupGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        }
        
        const powerupMaterial = new THREE.MeshStandardMaterial({
            color: powerupType.color,
            metalness: 0.7,
            roughness: 0.2,
            emissive: powerupType.color,
            emissiveIntensity: 0.5
        });
        
        const powerup = new THREE.Mesh(powerupGeometry, powerupMaterial);
        powerup.position.set(loc.x, loc.y, loc.z);
        powerup.castShadow = true;
        scene.add(powerup);
        
        // Animation
        const powerupAnim = {
            phase: Math.random() * Math.PI * 2,
            update: (delta) => {
                powerupAnim.phase += 0.03 * delta;
                
                powerup.rotation.x += 0.01 * delta;
                powerup.rotation.y += 0.02 * delta;
                powerup.position.y = loc.y + Math.sin(powerupAnim.phase) * 0.3;
                
                return powerup.userData.collected;
            }
        };
        
        window.animations.push(powerupAnim);
        
        // Mark as powerup for interaction
        powerup.userData = {
            type: 'powerup',
            interactive: true,
            collected: false,
            powerupType: powerupType.type
        };
    });
}

// Create skybox with stars
function createSkybox(scene) {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = gameState.device.isMobile ? 2000 : 5000; // Reduced star count for mobile
    
    const positions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        
        // Create stars in a large sphere around the scene
        const radius = 100 + Math.random() * 900;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        // Star colors (mostly white/blue but some variation)
        const r = Math.random() * 0.3 + 0.7;
        const g = Math.random() * 0.3 + 0.7;
        const b = Math.random();
        
        starColors[i3] = r;
        starColors[i3 + 1] = g;
        starColors[i3 + 2] = b;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

export { 
    initScene, 
    setupLighting, 
    createGround, 
    generateGameWorld
};