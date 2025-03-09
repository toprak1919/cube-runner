import * as THREE from 'three';
import { gameState, isMobile } from './game-state.js';

// Constants for world generation
const CHUNK_SIZE = 100; // Size of each world chunk
const RENDER_DISTANCE = isMobile ? 1 : 3; // How many chunks to render in each direction
const MAX_CACHED_CHUNKS = isMobile ? 9 : 25; // Maximum number of chunks to keep in memory

// Store loaded chunks
const loadedChunks = new Map();
const activeChunks = new Set();

// Store biome definitions
const biomeTypes = {
    CENTRAL: 'central',
    DATA: 'data',
    SCIENCE: 'science',
    POWER: 'power',
    OBSTACLE: 'obstacle',
    MOUNTAIN: 'mountain',
    CRYSTAL: 'crystal',
    VOID: 'void',
    NEON: 'neon',
    CYBER: 'cyber'
};

// Biome definitions
const biomes = {
    [biomeTypes.CENTRAL]: {
        name: 'Central Hub',
        color: 0x0055aa,
        groundColor: 0x0a0a14,
        lightColor: 0x00aaff,
        structures: ['hub', 'terminal', 'platform'],
        collectibleDensity: 0.2,
        height: 0
    },
    [biomeTypes.DATA]: {
        name: 'Data Towers',
        color: 0x0066cc,
        groundColor: 0x0a0a18,
        lightColor: 0x0088ff,
        structures: ['tower', 'antenna', 'server'],
        collectibleDensity: 0.5,
        height: 2
    },
    [biomeTypes.SCIENCE]: {
        name: 'Science Lab',
        color: 0x0077cc,
        groundColor: 0x0a0a1c,
        lightColor: 0x00ffff,
        structures: ['lab', 'dome', 'research'],
        collectibleDensity: 0.4,
        height: 1
    },
    [biomeTypes.POWER]: {
        name: 'Power Core',
        color: 0xff00ff,
        groundColor: 0x0a0a14,
        lightColor: 0xff00ff,
        structures: ['reactor', 'battery', 'generator'],
        collectibleDensity: 0.5,
        height: 0
    },
    [biomeTypes.OBSTACLE]: {
        name: 'Obstacle Zone',
        color: 0x00cc00,
        groundColor: 0x0a0a14,
        lightColor: 0x00ff00,
        structures: ['platform', 'barrier', 'jump'],
        collectibleDensity: 0.7,
        height: 1
    },
    [biomeTypes.MOUNTAIN]: {
        name: 'Digital Mountains',
        color: 0x4444cc,
        groundColor: 0x0a0a20,
        lightColor: 0x4466ff,
        structures: ['peak', 'cave', 'bridge'],
        collectibleDensity: 0.3,
        height: 15
    },
    [biomeTypes.CRYSTAL]: {
        name: 'Crystal Fields',
        color: 0x00ffaa,
        groundColor: 0x0a0a18,
        lightColor: 0x00ffcc,
        structures: ['crystal', 'formation', 'shard'],
        collectibleDensity: 0.6,
        height: 3
    },
    [biomeTypes.VOID]: {
        name: 'Data Void',
        color: 0x220066,
        groundColor: 0x000000,
        lightColor: 0x8800ff,
        structures: ['fragment', 'glitch', 'void'],
        collectibleDensity: 0.8,
        height: -5
    },
    [biomeTypes.NEON]: {
        name: 'Neon District',
        color: 0xff00aa,
        groundColor: 0x0a0a14,
        lightColor: 0xff00dd,
        structures: ['building', 'sign', 'grid'],
        collectibleDensity: 0.5,
        height: 2
    },
    [biomeTypes.CYBER]: {
        name: 'Cyber Junction',
        color: 0x00ccaa,
        groundColor: 0x0a0a14,
        lightColor: 0x00ffbb,
        structures: ['node', 'connection', 'switch'],
        collectibleDensity: 0.4,
        height: 1
    }
};

// Noise function for terrain generation (simple implementation)
const noise = {
    seed: Math.random() * 10000,
    simplex: function(x, y) {
        const dot = 2.5 * (Math.sin(x * 0.1 + this.seed) + Math.cos(y * 0.1 + this.seed));
        return (Math.sin(dot) + 1) * 0.5;
    },
    octave: function(x, y, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.simplex(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return total / maxValue;
    }
};

// World map generation 
// Uses a combination of noise and voronoi-like regions to create distinct biomes
function generateWorldMap(worldSeed) {
    if (worldSeed) {
        noise.seed = worldSeed;
    }
    
    // Create biome centers - fixed special locations
    const biomeCenters = [
        { x: 0, z: 0, type: biomeTypes.CENTRAL },
        { x: 3, z: 3, type: biomeTypes.DATA },
        { x: -3, z: 3, type: biomeTypes.SCIENCE },
        { x: 0, z: 4, type: biomeTypes.POWER },
        { x: -4, z: 0, type: biomeTypes.OBSTACLE },
        { x: 4, z: -4, type: biomeTypes.MOUNTAIN },
        { x: -2, z: -4, type: biomeTypes.CRYSTAL },
        { x: 5, z: 0, type: biomeTypes.VOID },
        { x: 0, z: -5, type: biomeTypes.NEON },
        { x: -5, z: -3, type: biomeTypes.CYBER }
    ];
    
    // Also place random biome centers further out
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 7 + Math.random() * 15; // Further from center
        const x = Math.floor(Math.cos(angle) * distance);
        const z = Math.floor(Math.sin(angle) * distance);
        
        // Don't place too close to existing centers
        if (biomeCenters.some(center => 
            Math.abs(center.x - x) < 3 && Math.abs(center.z - z) < 3)) {
            continue;
        }
        
        // Pick a random biome type (excluding CENTRAL)
        const biomeTypes = Object.values(biomeTypes).filter(t => t !== 'central');
        const type = biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
        
        biomeCenters.push({ x, z, type });
    }
    
    return {
        getBiomeAt: function(chunkX, chunkZ) {
            // For the origin chunk, always return the central biome
            if (chunkX === 0 && chunkZ === 0) {
                return biomes[biomeTypes.CENTRAL];
            }
            
            // Find the closest biome center
            let closestBiome = null;
            let closestDistance = Infinity;
            
            for (const center of biomeCenters) {
                const dx = center.x - chunkX;
                const dz = center.z - chunkZ;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Add some noise to the boundaries
                const noiseFactor = noise.octave(chunkX * 0.5, chunkZ * 0.5, 2, 0.5) * 0.8;
                const adjustedDistance = distance - noiseFactor;
                
                if (adjustedDistance < closestDistance) {
                    closestDistance = adjustedDistance;
                    closestBiome = biomes[center.type];
                }
            }
            
            return closestBiome || biomes[biomeTypes.CENTRAL];
        },
        
        getHeightAt: function(x, z) {
            // Get the biome for large-scale features
            const chunkX = Math.floor(x / CHUNK_SIZE);
            const chunkZ = Math.floor(z / CHUNK_SIZE);
            const biome = this.getBiomeAt(chunkX, chunkZ);
            
            // Base height from the biome
            const baseHeight = biome.height;
            
            // Add noise for terrain variation
            const terrainNoise = noise.octave(x * 0.01, z * 0.01, 4, 0.5) * 5;
            
            // Add smaller details
            const detailNoise = noise.octave(x * 0.1, z * 0.1, 2, 0.3) * 0.5;
            
            return baseHeight + terrainNoise + detailNoise;
        }
    };
}

// Global world map instance
let worldMap = null;

// Initialize the world generator
function initWorldGenerator(scene, worldSeed) {
    // Create the world map
    worldMap = generateWorldMap(worldSeed);
    
    // Clear any existing chunks
    loadedChunks.clear();
    activeChunks.clear();
    
    return worldMap;
}

// Get chunk key from coordinates
function getChunkKey(x, z) {
    return `${x},${z}`;
}

// Load a single chunk
function loadChunk(scene, chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    
    // Check if chunk already exists
    if (loadedChunks.has(key)) {
        const chunk = loadedChunks.get(key);
        if (!chunk.active) {
            chunk.group.visible = true;
            chunk.active = true;
            activeChunks.add(key);
        }
        return chunk;
    }
    
    // Get biome for this chunk
    const biome = worldMap.getBiomeAt(chunkX, chunkZ);
    
    // Create chunk group
    const chunkGroup = new THREE.Group();
    chunkGroup.position.set(chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE);
    scene.add(chunkGroup);
    
    // Generate ground for chunk
    generateChunkGround(chunkGroup, biome, chunkX, chunkZ);
    
    // Generate structures based on biome
    generateChunkStructures(chunkGroup, biome, chunkX, chunkZ);
    
    // Add lighting specific to this biome
    addChunkLighting(chunkGroup, biome);
    
    // Place collectibles in this chunk based on biome
    placeChunkCollectibles(chunkGroup, biome);
    
    // Store chunk data
    const chunk = {
        group: chunkGroup,
        biome: biome,
        x: chunkX,
        z: chunkZ,
        active: true
    };
    
    loadedChunks.set(key, chunk);
    activeChunks.add(key);
    
    return chunk;
}

// Generate ground for a chunk
function generateChunkGround(chunkGroup, biome, chunkX, chunkZ) {
    // Create heightmap for this chunk
    const resolution = isMobile ? 10 : 20; // Grid resolution
    const step = CHUNK_SIZE / resolution;
    
    // Create ground geometry
    const groundGeometry = new THREE.PlaneGeometry(
        CHUNK_SIZE, 
        CHUNK_SIZE, 
        resolution, 
        resolution
    );
    
    // Set heights based on noise
    const vertices = groundGeometry.attributes.position.array;
    
    for (let i = 0; i < vertices.length; i += 3) {
        // Get local x,z coordinates
        const localX = vertices[i];
        const localZ = vertices[i + 2];
        
        // Convert to world coordinates
        const worldX = localX + chunkX * CHUNK_SIZE;
        const worldZ = localZ + chunkZ * CHUNK_SIZE;
        
        // Get height from world map
        vertices[i + 1] = worldMap.getHeightAt(worldX, worldZ);
    }
    
    // Update geometry
    groundGeometry.computeVertexNormals();
    
    // Create ground material with the biome's color
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: biome.groundColor,
        metalness: 0.7,
        roughness: 0.3,
        emissive: new THREE.Color(biome.color).multiplyScalar(0.1),
        emissiveIntensity: 0.2,
        wireframe: false
    });
    
    // Create ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    ground.receiveShadow = true;
    chunkGroup.add(ground);
    
    // Add grid lines for futuristic look
    const gridMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(biome.color).multiplyScalar(0.3),
        transparent: true,
        opacity: 0.3
    });
    
    const gridSize = CHUNK_SIZE;
    const gridDivisions = 10;
    const gridStep = gridSize / gridDivisions;
    
    // Create grid
    for (let i = 0; i <= gridDivisions; i++) {
        const position = -CHUNK_SIZE / 2 + i * gridStep;
        
        // X direction line
        const geometryX = new THREE.BufferGeometry();
        const pointsX = [];
        
        for (let j = 0; j <= gridDivisions; j++) {
            const x = -CHUNK_SIZE / 2 + j * gridStep;
            const z = position;
            const y = worldMap.getHeightAt(x + chunkX * CHUNK_SIZE, z + chunkZ * CHUNK_SIZE) + 0.1;
            pointsX.push(x, y, z);
        }
        
        geometryX.setAttribute('position', new THREE.Float32BufferAttribute(pointsX, 3));
        const lineX = new THREE.Line(geometryX, gridMaterial);
        chunkGroup.add(lineX);
        
        // Z direction line
        const geometryZ = new THREE.BufferGeometry();
        const pointsZ = [];
        
        for (let j = 0; j <= gridDivisions; j++) {
            const x = position;
            const z = -CHUNK_SIZE / 2 + j * gridStep;
            const y = worldMap.getHeightAt(x + chunkX * CHUNK_SIZE, z + chunkZ * CHUNK_SIZE) + 0.1;
            pointsZ.push(x, y, z);
        }
        
        geometryZ.setAttribute('position', new THREE.Float32BufferAttribute(pointsZ, 3));
        const lineZ = new THREE.Line(geometryZ, gridMaterial);
        chunkGroup.add(lineZ);
    }
}

// Generate structures for a chunk based on biome
function generateChunkStructures(chunkGroup, biome, chunkX, chunkZ) {
    // Different structures based on biome type
    const structureGenerators = {
        hub: createHubStructure,
        terminal: createTerminalStructure,
        platform: createPlatformStructure,
        tower: createTowerStructure, 
        antenna: createAntennaStructure,
        server: createServerStructure,
        lab: createLabStructure,
        dome: createDomeStructure,
        research: createResearchStructure,
        reactor: createReactorStructure,
        battery: createBatteryStructure,
        generator: createGeneratorStructure,
        barrier: createBarrierStructure,
        jump: createJumpStructure,
        peak: createPeakStructure,
        cave: createCaveStructure,
        bridge: createBridgeStructure,
        crystal: createCrystalStructure,
        formation: createFormationStructure,
        shard: createShardStructure,
        fragment: createFragmentStructure,
        glitch: createGlitchStructure,
        void: createVoidStructure,
        building: createBuildingStructure,
        sign: createSignStructure,
        grid: createGridStructure,
        node: createNodeStructure,
        connection: createConnectionStructure,
        switch: createSwitchStructure
    };
    
    // Seed the random function for consistent results
    const randomSeed = noise.seed + chunkX * 1000 + chunkZ;
    const random = createSeededRandom(randomSeed);
    
    // Determine number of structures
    const isOriginChunk = chunkX === 0 && chunkZ === 0;
    const numStructures = isOriginChunk ? 1 : Math.floor(random() * 3) + 1;
    
    // Place structures
    for (let i = 0; i < numStructures; i++) {
        // Choose a structure type from the biome's available structures
        const structureType = biome.structures[Math.floor(random() * biome.structures.length)];
        
        // Get the structure generator function
        const structureGenerator = structureGenerators[structureType];
        
        if (structureGenerator) {
            // Determine position within chunk
            let x, z;
            
            if (isOriginChunk && i === 0) {
                // Put the first structure in the origin chunk at the center
                x = 0;
                z = 0;
            } else {
                // Random position within chunk that's not too close to the edge
                x = (random() * 0.8 - 0.4) * CHUNK_SIZE;
                z = (random() * 0.8 - 0.4) * CHUNK_SIZE;
            }
            
            // Get the height at this position
            const worldX = x + chunkX * CHUNK_SIZE;
            const worldZ = z + chunkZ * CHUNK_SIZE;
            const y = worldMap.getHeightAt(worldX, worldZ);
            
            // Generate the structure
            structureGenerator(chunkGroup, x, y, z, biome, random);
        }
    }
}

// Add lighting specific to a chunk
function addChunkLighting(chunkGroup, biome) {
    // Add ambient light to the chunk
    const ambientIntensity = 0.2;
    const ambientColor = new THREE.Color(biome.lightColor).multiplyScalar(ambientIntensity);
    
    // Add point lights
    const numLights = isMobile ? 1 : 2;
    
    for (let i = 0; i < numLights; i++) {
        // Determine light position - random within chunk
        const x = (Math.random() * 0.8 - 0.4) * CHUNK_SIZE;
        const z = (Math.random() * 0.8 - 0.4) * CHUNK_SIZE;
        const worldX = x + chunkGroup.position.x;
        const worldZ = z + chunkGroup.position.z;
        const y = worldMap.getHeightAt(worldX, worldZ) + 5 + Math.random() * 5;
        
        // Create point light
        const intensity = 1.0;
        const distance = 50;
        const pointLight = new THREE.PointLight(biome.lightColor, intensity, distance);
        pointLight.position.set(x, y, z);
        
        // Only enable shadows on high-end devices
        if (!isMobile) {
            pointLight.castShadow = true;
            pointLight.shadow.mapSize.width = 512;
            pointLight.shadow.mapSize.height = 512;
        }
        
        chunkGroup.add(pointLight);
        
        // Add a small glowing sphere to represent the light
        const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: biome.lightColor
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(pointLight.position);
        chunkGroup.add(sphere);
    }
}

// Place collectibles within a chunk
function placeChunkCollectibles(chunkGroup, biome) {
    // Determine number of collectibles based on biome density
    const numCollectibles = Math.floor(biome.collectibleDensity * 5);
    
    // Seed random function for consistent results
    const randomSeed = noise.seed + chunkGroup.position.x * 1000 + chunkGroup.position.z;
    const random = createSeededRandom(randomSeed);
    
    for (let i = 0; i < numCollectibles; i++) {
        // Random position within chunk
        const x = (random() * 0.9 - 0.45) * CHUNK_SIZE;
        const z = (random() * 0.9 - 0.45) * CHUNK_SIZE;
        
        // Get height at this position
        const worldX = x + chunkGroup.position.x;
        const worldZ = z + chunkGroup.position.z;
        const y = worldMap.getHeightAt(worldX, worldZ) + 1.5;
        
        // Create collectible
        createCollectible(chunkGroup, x, y, z, biome, random);
    }
}

// Update chunks based on player position
function updateChunks(scene, playerPosition) {
    // Determine which chunk the player is in
    const playerChunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);
    
    // Load chunks in render distance
    const newActiveChunks = new Set();
    
    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
        for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
            const key = getChunkKey(x, z);
            newActiveChunks.add(key);
            
            // Load chunk if not already loaded
            loadChunk(scene, x, z);
        }
    }
    
    // Hide chunks outside render distance
    for (const key of activeChunks) {
        if (!newActiveChunks.has(key)) {
            const chunk = loadedChunks.get(key);
            if (chunk) {
                chunk.group.visible = false;
                chunk.active = false;
            }
            activeChunks.delete(key);
        }
    }
    
    // Limit the number of loaded chunks to avoid memory issues
    if (loadedChunks.size > MAX_CACHED_CHUNKS) {
        // Find the furthest chunks to unload
        const chunksToKeep = Array.from(loadedChunks.entries())
            .map(([key, chunk]) => {
                const dx = chunk.x - playerChunkX;
                const dz = chunk.z - playerChunkZ;
                const distance = Math.sqrt(dx * dx + dz * dz);
                return { key, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, MAX_CACHED_CHUNKS)
            .map(item => item.key);
        
        // Remove furthest chunks
        for (const [key, chunk] of loadedChunks.entries()) {
            if (!chunksToKeep.includes(key)) {
                scene.remove(chunk.group);
                loadedChunks.delete(key);
                activeChunks.delete(key);
            }
        }
    }
}

// Seeded random number generator
function createSeededRandom(seed) {
    return function() {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
}

// Structure generators
// These functions create different types of structures

function createHubStructure(chunkGroup, x, y, z, biome, random) {
    // Create central platform
    const platformRadius = 8;
    const platformHeight = 1;
    
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius + 2, platformHeight, 16);
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.8,
        roughness: 0.2,
        emissive: new THREE.Color(biome.color).multiplyScalar(0.2)
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y + platformHeight / 2, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    platform.userData = { collidable: true };
    chunkGroup.add(platform);
    
    // Add decorative ring
    const ringGeometry = new THREE.TorusGeometry(platformRadius + 1, 0.2, 16, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: biome.lightColor });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(x, y + platformHeight + 0.1, z);
    ring.rotation.x = Math.PI / 2;
    chunkGroup.add(ring);
    
    // Add central holographic element
    const coreHeight = 6;
    const coreRadius = 1;
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(coreRadius, coreRadius * 1.5, 1, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + platformHeight + 0.5, z);
    base.castShadow = true;
    chunkGroup.add(base);
    
    // Holographic effect
    const holoGeometry = new THREE.SphereGeometry(3, 16, 16);
    const holoMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    
    const hologram = new THREE.Mesh(holoGeometry, holoMaterial);
    hologram.position.set(x, y + platformHeight + 4, z);
    chunkGroup.add(hologram);
    
    // Add animation to the hologram
    const animation = {
        mesh: hologram,
        phase: random() * Math.PI * 2,
        update: function(delta) {
            this.phase += 0.02 * delta;
            this.mesh.rotation.y += 0.01 * delta;
            
            // Pulsing effect
            const scale = 1 + Math.sin(this.phase) * 0.1;
            this.mesh.scale.set(scale, scale, scale);
            
            // Change opacity
            holoMaterial.opacity = 0.2 + Math.sin(this.phase * 0.5) * 0.1;
            
            return false; // Animation continues
        }
    };
    
    window.animations.push(animation);
    
    // Add pillars around the platform
    const numPillars = 6;
    for (let i = 0; i < numPillars; i++) {
        const angle = (i / numPillars) * Math.PI * 2;
        const pillarX = x + Math.sin(angle) * (platformRadius - 1);
        const pillarZ = z + Math.cos(angle) * (platformRadius - 1);
        
        const pillarHeight = 4;
        const pillarGeometry = new THREE.BoxGeometry(1, pillarHeight, 1);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: biome.color,
            metalness: 0.7,
            roughness: 0.3,
            emissive: new THREE.Color(biome.color).multiplyScalar(0.2)
        });
        
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(pillarX, y + platformHeight + pillarHeight / 2, pillarZ);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pillar.userData = { collidable: true };
        chunkGroup.add(pillar);
        
        // Add light on top of pillar
        const light = new THREE.PointLight(biome.lightColor, 0.5, 10);
        light.position.set(0, pillarHeight / 2 + 0.5, 0);
        pillar.add(light);
        
        // Add glowing orb
        const orbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const orbMaterial = new THREE.MeshBasicMaterial({ color: biome.lightColor });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.set(0, pillarHeight / 2 + 0.5, 0);
        pillar.add(orb);
    }
}

function createTowerStructure(chunkGroup, x, y, z, biome, random) {
    // Tower base
    const baseSize = 8;
    const baseHeight = 1;
    
    const baseGeometry = new THREE.BoxGeometry(baseSize, baseHeight, baseSize);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + baseHeight / 2, z);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { collidable: true };
    chunkGroup.add(base);
    
    // Tower height
    const towerHeight = 15 + Math.floor(random() * 10);
    const segmentHeight = 2;
    const segments = Math.floor(towerHeight / segmentHeight);
    
    for (let i = 0; i < segments; i++) {
        const segmentSize = 4 - (i / segments) * 2;
        const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentHeight, segmentSize);
        const segmentMaterial = new THREE.MeshStandardMaterial({
            color: biome.color,
            metalness: 0.7,
            roughness: 0.3,
            emissive: new THREE.Color(biome.color).multiplyScalar(i / segments * 0.3)
        });
        
        const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        segment.position.set(x, y + baseHeight + i * segmentHeight + segmentHeight / 2, z);
        segment.castShadow = true;
        segment.receiveShadow = true;
        segment.userData = { collidable: true };
        chunkGroup.add(segment);
        
        // Add emissive bands at segment junctions
        if (i < segments - 1) {
            const bandGeometry = new THREE.BoxGeometry(segmentSize + 0.5, 0.1, segmentSize + 0.5);
            const bandMaterial = new THREE.MeshBasicMaterial({ color: biome.lightColor });
            const band = new THREE.Mesh(bandGeometry, bandMaterial);
            band.position.set(x, y + baseHeight + (i + 1) * segmentHeight, z);
            chunkGroup.add(band);
        }
    }
    
    // Tower top
    const topGeometry = new THREE.SphereGeometry(2, 16, 16);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: biome.lightColor,
        metalness: 0.5,
        roughness: 0.1,
        emissive: biome.lightColor,
        emissiveIntensity: 0.5
    });
    
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(x, y + baseHeight + towerHeight, z);
    top.castShadow = true;
    chunkGroup.add(top);
    
    // Energy beam from top
    const beamGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.7
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(0, 5, 0);
    top.add(beam);
    
    // Rotating ring around top
    const ringGeometry = new THREE.TorusGeometry(3, 0.2, 16, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: biome.lightColor });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(x, y + baseHeight + towerHeight, z);
    chunkGroup.add(ring);
    
    // Animation for the ring
    const animation = {
        mesh: ring,
        update: function(delta) {
            this.mesh.rotation.z += 0.01 * delta;
            this.mesh.rotation.x += 0.005 * delta;
            return false; // Animation continues
        }
    };
    
    window.animations.push(animation);
}

function createCrystalStructure(chunkGroup, x, y, z, biome, random) {
    // Crystal cluster
    const numCrystals = 5 + Math.floor(random() * 5);
    
    for (let i = 0; i < numCrystals; i++) {
        // Crystal position
        const angle = random() * Math.PI * 2;
        const distance = random() * 5;
        const offsetX = Math.sin(angle) * distance;
        const offsetZ = Math.cos(angle) * distance;
        
        // Crystal size
        const height = 3 + random() * 7;
        const width = 0.5 + random() * 1.5;
        
        // Create crystal shape
        const crystalGeometry = new THREE.ConeGeometry(width, height, 6);
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: biome.color,
            metalness: 0.8,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8,
            emissive: biome.lightColor,
            emissiveIntensity: 0.3
        });
        
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.set(x + offsetX, y + height / 2, z + offsetZ);
        
        // Tilt crystal slightly
        crystal.rotation.x = (random() - 0.5) * 0.5;
        crystal.rotation.z = (random() - 0.5) * 0.5;
        
        crystal.castShadow = true;
        crystal.receiveShadow = true;
        crystal.userData = { collidable: true };
        chunkGroup.add(crystal);
        
        // Add inner glow effect
        const glowGeometry = new THREE.ConeGeometry(width * 0.6, height * 0.8, 6);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: biome.lightColor,
            transparent: true,
            opacity: 0.4
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, 0);
        crystal.add(glow);
        
        // Add pulsing animation to the crystal
        const animation = {
            mesh: crystal,
            glowMesh: glow,
            phase: random() * Math.PI * 2,
            update: function(delta) {
                this.phase += 0.02 * delta;
                
                // Pulse opacity
                glowMaterial.opacity = 0.3 + Math.sin(this.phase) * 0.1;
                
                // Pulse emissive intensity
                crystalMaterial.emissiveIntensity = 0.2 + Math.sin(this.phase) * 0.1;
                
                return false; // Animation continues
            }
        };
        
        window.animations.push(animation);
    }
    
    // Add light in the center of the cluster
    const light = new THREE.PointLight(biome.lightColor, 1, 20);
    light.position.set(x, y + 3, z);
    chunkGroup.add(light);
}

// Basic structure generators for other types
function createTerminalStructure(chunkGroup, x, y, z, biome, random) {
    // Terminal console
    const baseWidth = 3;
    const baseHeight = 1;
    const baseDepth = 2;
    
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + baseHeight / 2, z);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { collidable: true };
    chunkGroup.add(base);
    
    // Screen
    const screenWidth = 2.5;
    const screenHeight = 1.8;
    const screenDepth = 0.1;
    
    const screenGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenDepth);
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.8
    });
    
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(x, y + baseHeight + screenHeight / 2, z);
    screen.rotation.x = -Math.PI / 6; // Tilt for ergonomics
    chunkGroup.add(screen);
    
    // Animation for screen flicker
    const animation = {
        mesh: screen,
        phase: random() * Math.PI * 2,
        update: function(delta) {
            this.phase += 0.1 * delta;
            
            // Flicker effect
            if (Math.random() > 0.95) {
                screenMaterial.opacity = 0.5 + Math.random() * 0.3;
            } else {
                screenMaterial.opacity = 0.8;
            }
            
            return false; // Animation continues
        }
    };
    
    window.animations.push(animation);
}

function createPlatformStructure(chunkGroup, x, y, z, biome, random) {
    // Platform dimensions
    const width = 8 + random() * 4;
    const depth = 8 + random() * 4;
    const height = 0.5;
    
    // Create platform
    const platformGeometry = new THREE.BoxGeometry(width, height, depth);
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.7,
        roughness: 0.3,
        emissive: new THREE.Color(biome.color).multiplyScalar(0.1)
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y + height / 2, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    platform.userData = { collidable: true };
    chunkGroup.add(platform);
    
    // Add glowing border
    const borderGeometry = new THREE.BoxGeometry(width + 0.2, height / 2, depth + 0.2);
    borderGeometry.translate(0, -height / 4, 0);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.7
    });
    
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    platform.add(border);
    
    // If this is not just a simple platform, add some details
    if (random() > 0.3) {
        // Add small pillars at corners
        const pillarPositions = [
            [width / 2 - 0.5, height / 2, depth / 2 - 0.5],
            [width / 2 - 0.5, height / 2, -depth / 2 + 0.5],
            [-width / 2 + 0.5, height / 2, depth / 2 - 0.5],
            [-width / 2 + 0.5, height / 2, -depth / 2 + 0.5]
        ];
        
        for (const pos of pillarPositions) {
            const pillarHeight = 1 + random() * 2;
            const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.2, pillarHeight, 8);
            const pillarMaterial = new THREE.MeshStandardMaterial({
                color: biome.color,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pos[0], pos[1] + pillarHeight / 2, pos[2]);
            platform.add(pillar);
            
            // Add light on top
            const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: biome.lightColor
            });
            
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(0, pillarHeight / 2, 0);
            pillar.add(light);
        }
    }
    
    // For mobile platforms, add animation
    if (biome.name === 'Obstacle Zone' && random() > 0.5) {
        // Determine movement type
        const movementType = random() > 0.5 ? 'vertical' : 'horizontal';
        const moveDistance = 2 + random() * 3;
        const moveSpeed = 0.02 + random() * 0.02;
        
        const animation = {
            mesh: platform,
            phase: random() * Math.PI * 2,
            update: function(delta) {
                this.phase += moveSpeed * delta;
                
                if (movementType === 'vertical') {
                    this.mesh.position.y = y + height / 2 + Math.sin(this.phase) * moveDistance;
                } else {
                    this.mesh.position.x = x + Math.sin(this.phase) * moveDistance;
                    this.mesh.position.z = z + Math.cos(this.phase) * moveDistance;
                }
                
                return false; // Animation continues
            }
        };
        
        window.animations.push(animation);
    }
}

// More structure generators would go here
// For brevity, I'll implement a few key ones and provide placeholders for the rest

function createAntennaStructure(chunkGroup, x, y, z, biome, random) {
    // Create a tall antenna structure
    const baseSize = 2;
    const height = 15 + random() * 10;
    
    // Base
    const baseGeometry = new THREE.BoxGeometry(baseSize, 1, baseSize);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + 0.5, z);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { collidable: true };
    chunkGroup.add(base);
    
    // Main antenna shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.2, 0.3, height, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.set(x, y + height / 2 + 1, z);
    shaft.castShadow = true;
    shaft.userData = { collidable: true };
    chunkGroup.add(shaft);
    
    // Add horizontal elements along the shaft
    const numElements = Math.floor(height / 3);
    
    for (let i = 0; i < numElements; i++) {
        const elementY = y + 1 + i * 3 + random();
        const elementSize = 1 + random() * 2;
        
        // Create horizontal element
        const elementGeometry = new THREE.BoxGeometry(elementSize, 0.2, 0.2);
        const elementMaterial = new THREE.MeshStandardMaterial({
            color: biome.color,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const element = new THREE.Mesh(elementGeometry, elementMaterial);
        element.position.set(x, elementY, z);
        element.rotation.y = random() * Math.PI;
        chunkGroup.add(element);
        
        // Add light at the end of the element
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: biome.lightColor
        });
        
        const light1 = new THREE.Mesh(lightGeometry, lightMaterial);
        light1.position.set(elementSize / 2, 0, 0);
        element.add(light1);
        
        const light2 = new THREE.Mesh(lightGeometry, lightMaterial);
        light2.position.set(-elementSize / 2, 0, 0);
        element.add(light2);
    }
    
    // Add blinking light at the top
    const topLightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const topLightMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor
    });
    
    const topLight = new THREE.Mesh(topLightGeometry, topLightMaterial);
    topLight.position.set(x, y + height + 1, z);
    chunkGroup.add(topLight);
    
    // Blinking animation
    const animation = {
        mesh: topLight,
        blinkCounter: 0,
        blinkRate: 0.5 + random() * 0.5,
        update: function(delta) {
            this.blinkCounter += delta;
            
            if (this.blinkCounter > this.blinkRate) {
                this.blinkCounter = 0;
                this.mesh.visible = !this.mesh.visible;
            }
            
            return false; // Animation continues
        }
    };
    
    window.animations.push(animation);
}

function createServerStructure(chunkGroup, x, y, z, biome, random) {
    // Server rack group
    const rackGroup = new THREE.Group();
    rackGroup.position.set(x, y, z);
    chunkGroup.add(rackGroup);
    
    // Determine rack dimensions
    const width = 3 + random() * 2;
    const height = 4 + random() * 2;
    const depth = 1 + random() * 1;
    
    // Create rack frame
    const frameGeometry = new THREE.BoxGeometry(width, height, depth);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, height / 2, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    frame.userData = { collidable: true };
    rackGroup.add(frame);
    
    // Add server modules
    const moduleHeight = 0.3;
    const moduleWidth = width - 0.2;
    const moduleDepth = depth - 0.1;
    const numModules = Math.floor((height - 0.2) / (moduleHeight + 0.1));
    
    for (let i = 0; i < numModules; i++) {
        const moduleY = 0.1 + i * (moduleHeight + 0.1) + moduleHeight / 2;
        
        // Server module
        const moduleGeometry = new THREE.BoxGeometry(moduleWidth, moduleHeight, moduleDepth);
        const moduleMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const module = new THREE.Mesh(moduleGeometry, moduleMaterial);
        module.position.set(0, moduleY, 0);
        frame.add(module);
        
        // Add blinking lights
        const numLights = Math.floor(3 + random() * 5);
        const lightSpacing = moduleWidth / (numLights + 1);
        
        for (let j = 0; j < numLights; j++) {
            const lightX = -moduleWidth / 2 + (j + 1) * lightSpacing;
            
            const lightGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            
            // Randomize light color
            const lightColor = Math.random() > 0.7 ? 0xff0000 : (Math.random() > 0.5 ? 0x00ff00 : biome.lightColor);
            
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: lightColor
            });
            
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(lightX, 0, moduleDepth / 2 + 0.01);
            module.add(light);
            
            // Add blinking animation for some lights
            if (random() > 0.7) {
                const blinkAnimation = {
                    mesh: light,
                    blinkRate: 0.5 + random() * 2,
                    blinkCounter: random() * 2,
                    update: function(delta) {
                        this.blinkCounter += delta;
                        
                        if (this.blinkCounter > this.blinkRate) {
                            this.blinkCounter = 0;
                            this.mesh.visible = !this.mesh.visible;
                        }
                        
                        return false; // Animation continues
                    }
                };
                
                window.animations.push(blinkAnimation);
            }
        }
    }
}

// Placeholders for other structure generators
function createLabStructure(chunkGroup, x, y, z, biome, random) {
    // Basic lab structure
    const width = 10;
    const height = 4;
    const depth = 8;
    
    // Main structure
    const labGeometry = new THREE.BoxGeometry(width, height, depth);
    const labMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.6,
        roughness: 0.4
    });
    
    const lab = new THREE.Mesh(labGeometry, labMaterial);
    lab.position.set(x, y + height / 2, z);
    lab.castShadow = true;
    lab.receiveShadow = true;
    lab.userData = { collidable: true };
    chunkGroup.add(lab);
    
    // Add windows
    const windowSize = 1;
    const windowPositions = [
        { x: width / 2 + 0.01, y: 0, z: -depth / 4, rotY: Math.PI / 2 },
        { x: width / 2 + 0.01, y: 0, z: depth / 4, rotY: Math.PI / 2 },
        { x: -width / 2 - 0.01, y: 0, z: -depth / 4, rotY: -Math.PI / 2 },
        { x: -width / 2 - 0.01, y: 0, z: depth / 4, rotY: -Math.PI / 2 },
        { x: 0, y: 0, z: depth / 2 + 0.01, rotY: 0 },
        { x: 0, y: 0, z: -depth / 2 - 0.01, rotY: Math.PI }
    ];
    
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    for (const pos of windowPositions) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(pos.x, pos.y, pos.z);
        window.rotation.y = pos.rotY;
        lab.add(window);
    }
}

function createDomeStructure(chunkGroup, x, y, z, biome, random) {
    // Basic dome structure
    const radius = 6 + random() * 4;
    const segments = 16;
    
    // Dome
    const domeGeometry = new THREE.SphereGeometry(radius, segments, segments, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(x, y, z);
    dome.castShadow = true;
    dome.receiveShadow = true;
    dome.userData = { collidable: true };
    chunkGroup.add(dome);
    
    // Create internal structure
    const innerRadius = radius * 0.8;
    const innerGeometry = new THREE.SphereGeometry(innerRadius, segments, segments, 0, Math.PI * 2, 0, Math.PI / 2);
    const innerMaterial = new THREE.MeshStandardMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.set(x, y, z);
    chunkGroup.add(inner);
    
    // Add glowing effect
    const glowAnimation = {
        mesh: inner,
        phase: random() * Math.PI * 2,
        update: function(delta) {
            this.phase += 0.02 * delta;
            
            // Pulse opacity
            innerMaterial.opacity = 0.05 + Math.sin(this.phase) * 0.05;
            
            return false; // Animation continues
        }
    };
    
    window.animations.push(glowAnimation);
}

// Simplified placeholder implementations for remaining structure types
function createResearchStructure(chunkGroup, x, y, z, biome, random) {
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createReactorStructure(chunkGroup, x, y, z, biome, random) {
    // Create a reactor core
    const coreRadius = 3;
    const coreHeight = 8;
    
    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(coreRadius + 2, coreRadius + 2, 1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + 0.5, z);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { collidable: true };
    chunkGroup.add(base);
    
    // Core cylinder
    const coreGeometry = new THREE.CylinderGeometry(coreRadius, coreRadius, coreHeight, 16);
    const coreMaterial = new THREE.MeshStandardMaterial({
        color: biome.color,
        metalness: 0.5,
        roughness: 0.5,
        emissive: biome.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(x, y + coreHeight / 2 + 1, z);
    core.castShadow = true;
    core.userData = { collidable: true };
    chunkGroup.add(core);
    
    // Energy field around core
    const fieldGeometry = new THREE.SphereGeometry(coreRadius + 1, 20, 20);
    const fieldMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.position.set(x, y + coreHeight / 2 + 1, z);
    field.scale.y = 2;
    chunkGroup.add(field);
    
    // Energy effect animation
    const animation = {
        coreMesh: core,
        fieldMesh: field,
        phase: random() * Math.PI * 2,
        update: function(delta) {
            this.phase += 0.01 * delta;
            
            // Rotate field
            this.fieldMesh.rotation.y += 0.01 * delta;
            this.fieldMesh.rotation.z += 0.005 * delta;
            
            // Pulse field
            const pulse = 1 + Math.sin(this.phase) * 0.1;
            this.fieldMesh.scale.set(pulse, pulse * 2, pulse);
            
            // Pulse core
            coreMaterial.emissiveIntensity = 0.4 + Math.sin(this.phase) * 0.2;
            
            return false;
        }
    };
    
    window.animations.push(animation);
}

function createBatteryStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createGeneratorStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createBarrierStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createJumpStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createPeakStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createCaveStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createBridgeStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createFormationStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createCrystalStructure(chunkGroup, x, y, z, biome, random);
}

function createShardStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createCrystalStructure(chunkGroup, x, y, z, biome, random);
}

function createFragmentStructure(chunkGroup, x, y, z, biome, random) {
    // Create floating fragments
    const numFragments = 5 + Math.floor(random() * 7);
    
    for (let i = 0; i < numFragments; i++) {
        // Fragment position
        const radius = 5 * random();
        const angle = random() * Math.PI * 2;
        const height = 2 + random() * 5;
        
        const fragX = x + Math.cos(angle) * radius;
        const fragZ = z + Math.sin(angle) * radius;
        const fragY = y + height;
        
        // Fragment size and rotation
        const size = 0.5 + random() * 1.5;
        const rotX = random() * Math.PI;
        const rotY = random() * Math.PI;
        const rotZ = random() * Math.PI;
        
        // Create fragment
        const fragmentGeometry = new THREE.TetrahedronGeometry(size, 0);
        const fragmentMaterial = new THREE.MeshStandardMaterial({
            color: biome.color,
            emissive: biome.lightColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
        fragment.position.set(fragX, fragY, fragZ);
        fragment.rotation.set(rotX, rotY, rotZ);
        fragment.castShadow = true;
        chunkGroup.add(fragment);
        
        // Floating animation
        const animation = {
            mesh: fragment,
            originY: fragY,
            phase: random() * Math.PI * 2,
            rotSpeed: 0.01 + random() * 0.02,
            update: function(delta) {
                this.phase += 0.02 * delta;
                
                // Float up and down
                this.mesh.position.y = this.originY + Math.sin(this.phase) * 0.5;
                
                // Slow rotation
                this.mesh.rotation.x += this.rotSpeed * delta;
                this.mesh.rotation.y += this.rotSpeed * delta;
                
                return false;
            }
        };
        
        window.animations.push(animation);
    }
}

function createGlitchStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createFragmentStructure(chunkGroup, x, y, z, biome, random);
}

function createVoidStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createFragmentStructure(chunkGroup, x, y, z, biome, random);
}

function createBuildingStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createSignStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createGridStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createNodeStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createConnectionStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

function createSwitchStructure(chunkGroup, x, y, z, biome, random) {
    // Simple placeholder implementation
    createPlatformStructure(chunkGroup, x, y, z, biome, random);
}

// Create collectible
function createCollectible(chunkGroup, x, y, z, biome, random) {
    const collectibleGeometry = new THREE.OctahedronGeometry(0.8, 0);
    const collectibleMaterial = new THREE.MeshStandardMaterial({
        color: biome.lightColor,
        metalness: 0.7,
        roughness: 0.2,
        emissive: biome.lightColor,
        emissiveIntensity: 0.5
    });
    
    const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
    collectible.position.set(x, y, z);
    collectible.castShadow = true;
    chunkGroup.add(collectible);
    
    // Animation for rotation and bobbing
    const collectibleAnim = {
        mesh: collectible,
        originY: y,
        phase: random() * Math.PI * 2,
        update: function(delta) {
            this.phase += 0.03 * delta;
            
            this.mesh.rotation.y += 0.02 * delta;
            this.mesh.position.y = this.originY + Math.sin(this.phase) * 0.2;
            
            return this.mesh.userData.collected;
        }
    };
    
    window.animations.push(collectibleAnim);
    
    // Add glow effect around collectible
    const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: biome.lightColor,
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
}

export { 
    initWorldGenerator,
    updateChunks,
    CHUNK_SIZE,
    worldMap
};