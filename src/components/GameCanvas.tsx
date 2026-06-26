import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Compass } from 'lucide-react';
import { BlockType, BLOCK_DETAILS, GameSettings, PlayerStats } from '../types';
import { PerlinNoise, SeededRandom } from '../utils/noise';
import { playSound } from '../utils/audio';
import { generateBlockTextureCanvas, generateCracksCanvas } from '../utils/textureGenerator';

interface GameCanvasProps {
  playerStats: PlayerStats;
  settings: GameSettings;
  worldBlocks: Record<string, number>;
  seed: string;
  isPaused: boolean;
  isMobile: boolean;
  mobileJoystick: { x: number; y: number } | null;
  mobileAction: 'break' | 'place' | 'jump' | 'sneak' | 'fly' | null;
  onClearMobileAction: () => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onUpdateBlocks: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  onUpdateMiniMap: (grid: number[][]) => void;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
}

export default function GameCanvas({
  playerStats,
  settings,
  worldBlocks,
  seed,
  isPaused,
  isMobile,
  mobileJoystick,
  mobileAction,
  onClearMobileAction,
  onUpdateStats,
  onUpdateBlocks,
  onUpdateMiniMap,
  onUpdateSettings,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Keep refs of react state/props for high-frequency animation loop
  const statsRef = useRef(playerStats);
  const settingsRef = useRef(settings);
  const blocksRef = useRef(worldBlocks);
  const isPausedRef = useRef(isPaused);
  const joystickRef = useRef(mobileJoystick);

  // Sync refs with props
  useEffect(() => { statsRef.current = playerStats; }, [playerStats]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { blocksRef.current = worldBlocks; }, [worldBlocks]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { joystickRef.current = mobileJoystick; }, [mobileJoystick]);

  // Handle Pointer Lock instructions popup state
  const [pointerLocked, setPointerLocked] = useState(false);
  const pointerLockedRef = useRef(false);

  useEffect(() => {
    pointerLockedRef.current = pointerLocked;
  }, [pointerLocked]);

  useEffect(() => {
    if (!mountRef.current) return;

    // -------------------------------------------------------------------------
    // 1. ENGINE INITIALIZATION
    // -------------------------------------------------------------------------
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    // Sky blue background or dynamic
    scene.background = new THREE.Color('#7dd3fc');
    
    // Ambient Fog
    scene.fog = new THREE.FogExp2('#7dd3fc', 0.03);

    const camera = new THREE.PerspectiveCamera(settingsRef.current.fov, width / height, 0.1, 100);
    // Set initial player position
    camera.position.set(playerStats.position.x, playerStats.position.y, playerStats.position.z);

    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------------------
    // 2. LIGHTS SETUP
    // -------------------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 0.8);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 30;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Group for Torch point lights to clean up on rebuilds
    const torchLightsGroup = new THREE.Group();
    scene.add(torchLightsGroup);

    // -------------------------------------------------------------------------
    // 3. TERRAIN GENERATOR & VOXEL MESH MANAGER
    // -------------------------------------------------------------------------
    const perlin = new PerlinNoise(seed);
    const rng = new SeededRandom(seed);

    // Reusable single column generation function for infinite terrain
    const generateColumn = (cx: number, cz: number, map: Record<string, number>) => {
      // 2D Perlin Noise terrain height
      const n = perlin.fbm2D(cx * 0.03, cz * 0.03, 3, 2.1, 0.45);
      // height range 5 to 22
      const heightLevel = Math.floor(n * 10 + 12);

      // Caves Carver 3D noise cache
      for (let y = 25; y >= -20; y--) {
        const key = `${cx},${y},${cz}`;

        // Check if Y is below surface
        if (y > heightLevel) {
          continue; // Air
        }

        // 3D Noise for Cave Carving (below surface - 2)
        if (y < heightLevel - 2) {
          // Wormhole caves logic
          const caveNoise = perlin.noise3D(cx * 0.09, y * 0.13, cz * 0.09);
          if (caveNoise > 0.40) {
            // Air pocket cave!
            continue;
          }
        }

        // Solid blocks assignment
        if (y === heightLevel) {
          map[key] = BlockType.GRASS;
          
          // Random tree generation on grass
          if (Math.abs(cx) > 3 && Math.abs(cz) > 3 && rng.range(0, 100) > 98.8) {
            // Spawn a tree trunk & leaves
            const treeH = Math.floor(rng.range(4, 6));
            for (let ty = 1; ty <= treeH; ty++) {
              map[`${cx},${y + ty},${cz}`] = BlockType.WOOD;
            }
            // Leaves canopy
            for (let lx = -2; lx <= 2; lx++) {
              for (let lz = -2; lz <= 2; lz++) {
                for (let ly = 0; ly <= 2; ly++) {
                  const lkey = `${cx + lx},${y + treeH + ly},${cz + lz}`;
                  if (!map[lkey]) {
                    map[lkey] = BlockType.LEAVES;
                  }
                }
              }
            }
          }
        } else if (y >= heightLevel - 3) {
          map[key] = BlockType.DIRT;
        } else {
          // Deep layers: Stone & Ores
          let blockType = BlockType.STONE;

          // Ore veins based on depth
          const oreRand = rng.range(0, 100);
          if (y < 4 && oreRand > 98.8) {
            blockType = BlockType.DIAMOND;
          } else if (y < 6 && oreRand > 97.5) {
            blockType = BlockType.GOLD;
          } else if (y < 8 && oreRand > 96.0) {
            blockType = BlockType.REDSTONE;
          } else if (y < 12 && oreRand > 94.0) {
            blockType = BlockType.IRON;
          } else if (y < 14 && oreRand > 91.0) {
            blockType = BlockType.COAL;
          }

          map[key] = blockType;
        }
      }
    };

    // Track generated columns to prevent duplicate generation
    const generatedColumns = new Set<string>();

    // Generate starter blocks in sparse dict if completely empty
    const initWorld = () => {
      const initialMap: Record<string, number> = { ...blocksRef.current };
      const keys = Object.keys(initialMap);
      
      // Parse any existing blocks to track already generated columns
      keys.forEach(k => {
        const parts = k.split(',');
        if (parts.length === 3) {
          generatedColumns.add(`${parts[0]},${parts[2]}`);
        }
      });

      // If we already have blocks saved, we don't overwrite
      if (keys.length > 50) return;

      const size = 32; // initial radius of columns
      for (let x = -size; x <= size; x++) {
        for (let z = -size; z <= size; z++) {
          generatedColumns.add(`${x},${z}`);
          generateColumn(x, z, initialMap);
        }
      }

      onUpdateBlocks(() => initialMap);
      blocksRef.current = initialMap;
    };

    initWorld();

    // Box Geometry
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Instanced Mesh Group for blocks
    const meshes: Record<number, THREE.InstancedMesh> = {};
    const materials: Record<number, THREE.Material | THREE.Material[]> = {};

    // Helper to build colors/materials for block types using the central texture generator
    const createVoxelMaterials = () => {
      const createTextureFromCanvas = (canvas: HTMLCanvasElement) => {
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
      };

      Object.values(BLOCK_DETAILS).forEach(details => {
        if (details.type === BlockType.AIR) return;

        if (details.type === BlockType.GRASS) {
          const sideTex = createTextureFromCanvas(generateBlockTextureCanvas(BlockType.GRASS, 'side'));
          const topTex = createTextureFromCanvas(generateBlockTextureCanvas(BlockType.GRASS, 'top'));
          const bottomTex = createTextureFromCanvas(generateBlockTextureCanvas(BlockType.GRASS, 'bottom'));

          const sideMat = new THREE.MeshLambertMaterial({ map: sideTex });
          const topMat = new THREE.MeshLambertMaterial({ map: topTex });
          const bottomMat = new THREE.MeshLambertMaterial({ map: bottomTex });

          materials[BlockType.GRASS] = [
            sideMat, // +X
            sideMat, // -X
            topMat,  // +Y
            bottomMat, // -Y
            sideMat, // +Z
            sideMat, // -Z
          ];
        } else if (details.type === BlockType.WOOD) {
          const sideTex = createTextureFromCanvas(generateBlockTextureCanvas(BlockType.WOOD, 'side'));
          const topTex = createTextureFromCanvas(generateBlockTextureCanvas(BlockType.WOOD, 'top'));

          const sideMat = new THREE.MeshLambertMaterial({ map: sideTex });
          const topMat = new THREE.MeshLambertMaterial({ map: topTex });

          materials[BlockType.WOOD] = [
            sideMat, // +X
            sideMat, // -X
            topMat,  // +Y
            topMat,  // -Y
            sideMat, // +Z
            sideMat, // -Z
          ];
        } else {
          // Standard single-texture material for all other blocks
          const sideTex = createTextureFromCanvas(generateBlockTextureCanvas(details.type, 'side'));
          materials[details.type] = new THREE.MeshLambertMaterial({
            map: sideTex,
            transparent: details.isTransparent,
            opacity: details.opacity ?? 1,
            emissive: details.emissiveColor ? new THREE.Color(details.emissiveColor) : new THREE.Color('#000000'),
            emissiveIntensity: details.emissiveColor ? 0.65 : 0,
          });
        }
      });
    };
    createVoxelMaterials();

    // Targeted block wireframe overlay
    const targetGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const targetMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const targetBox = new THREE.Mesh(targetGeo, targetMat);
    scene.add(targetBox);
    targetBox.visible = false;

    // Pre-generate cracking textures
    const crackTextures = [0.2, 0.4, 0.6, 0.8, 0.95].map(p => {
      const canvas = generateCracksCanvas(p);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    });

    const getCrackTexture = (progress: number): THREE.CanvasTexture | null => {
      if (progress < 0.15) return null;
      if (progress < 0.35) return crackTextures[0];
      if (progress < 0.55) return crackTextures[1];
      if (progress < 0.75) return crackTextures[2];
      if (progress < 0.9) return crackTextures[3];
      return crackTextures[4];
    };

    // Cracks overlay box mesh
    const cracksGeo = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const cracksMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const cracksBox = new THREE.Mesh(cracksGeo, cracksMat);
    scene.add(cracksBox);
    cracksBox.visible = false;

    // Drop item tracking resources
    const dropGeometry = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    interface DroppedItem {
      id: string;
      mesh: THREE.Mesh;
      type: BlockType;
      createdAt: number;
      velocity: THREE.Vector3;
    }
    const activeDroppedItems: DroppedItem[] = [];

    // -------------------------------------------------------------------------
    // ZOMBIE MOB SYSTEM
    // -------------------------------------------------------------------------
    interface ZombieMob {
      id: string;
      mesh: THREE.Group;
      health: number;
      maxHealth: number;
      verticalVelocity: number;
      knockbackVelocity: THREE.Vector3;
      lastHurtTime: number;
      lastAttackTime: number;
    }
    const activeMobs: ZombieMob[] = [];

    const getZombieMaterials = () => {
      // Skin material (solid green with some noise)
      const skinCanvas = document.createElement('canvas');
      skinCanvas.width = 16;
      skinCanvas.height = 16;
      const skinCtx = skinCanvas.getContext('2d')!;
      skinCtx.fillStyle = '#2e6f40';
      skinCtx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          if (Math.random() > 0.5) {
            skinCtx.fillStyle = Math.random() > 0.5 ? '#1f4f2d' : '#3c8c50';
            skinCtx.fillRect(i, j, 1, 1);
          }
        }
      }
      const skinTex = new THREE.CanvasTexture(skinCanvas);
      skinTex.magFilter = THREE.NearestFilter;
      skinTex.minFilter = THREE.NearestFilter;
      const skinMat = new THREE.MeshLambertMaterial({ map: skinTex });

      // Face material (with glowing red eyes!)
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 16;
      faceCanvas.height = 16;
      const faceCtx = faceCanvas.getContext('2d')!;
      faceCtx.fillStyle = '#2e6f40';
      faceCtx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          if (Math.random() > 0.5) {
            faceCtx.fillStyle = Math.random() > 0.5 ? '#1f4f2d' : '#3c8c50';
            faceCtx.fillRect(i, j, 1, 1);
          }
        }
      }
      // Red eyes with black borders (matches uploaded skin texture)
      faceCtx.fillStyle = '#ff0000'; // red pupil
      faceCtx.fillRect(3, 6, 2, 1);
      faceCtx.fillRect(11, 6, 2, 1);
      faceCtx.fillStyle = '#000000'; // black details
      faceCtx.fillRect(2, 6, 1, 1);
      faceCtx.fillRect(5, 6, 1, 1);
      faceCtx.fillRect(10, 6, 1, 1);
      faceCtx.fillRect(13, 6, 1, 1);
      faceCtx.fillStyle = '#1c4226'; // mouth
      faceCtx.fillRect(4, 11, 8, 2);

      const faceTex = new THREE.CanvasTexture(faceCanvas);
      faceTex.magFilter = THREE.NearestFilter;
      faceTex.minFilter = THREE.NearestFilter;
      const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });

      // Torso shirt texture
      const torsoCanvas = document.createElement('canvas');
      torsoCanvas.width = 16;
      torsoCanvas.height = 16;
      const torsoCtx = torsoCanvas.getContext('2d')!;
      torsoCtx.fillStyle = '#14859a'; // cyan shirt
      torsoCtx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          if (Math.random() > 0.6) {
            torsoCtx.fillStyle = Math.random() > 0.5 ? '#106c7e' : '#1fb1cc';
            torsoCtx.fillRect(i, j, 1, 1);
          }
        }
      }
      // Green neck insert
      torsoCtx.fillStyle = '#2e6f40';
      torsoCtx.fillRect(6, 0, 4, 3);

      const torsoTex = new THREE.CanvasTexture(torsoCanvas);
      torsoTex.magFilter = THREE.NearestFilter;
      torsoTex.minFilter = THREE.NearestFilter;
      const torsoMat = new THREE.MeshLambertMaterial({ map: torsoTex });

      // Pants material (blue/dark blue)
      const pantsCanvas = document.createElement('canvas');
      pantsCanvas.width = 16;
      pantsCanvas.height = 16;
      const pantsCtx = pantsCanvas.getContext('2d')!;
      pantsCtx.fillStyle = '#2a3b90'; // dark blue pants
      pantsCtx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          if (Math.random() > 0.5) {
            pantsCtx.fillStyle = Math.random() > 0.5 ? '#1d2766' : '#384cb8';
            pantsCtx.fillRect(i, j, 1, 1);
          }
        }
      }
      const pantsTex = new THREE.CanvasTexture(pantsCanvas);
      pantsTex.magFilter = THREE.NearestFilter;
      pantsTex.minFilter = THREE.NearestFilter;
      const pantsMat = new THREE.MeshLambertMaterial({ map: pantsTex });

      return { skinMat, faceMat, torsoMat, pantsMat };
    };

    const zombieMats = getZombieMaterials();

    const createZombieMesh = (mats: ReturnType<typeof getZombieMaterials>) => {
      const group = new THREE.Group();

      // Head: width 0.5, height 0.5, depth 0.5
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMats = [
        mats.skinMat, // right
        mats.skinMat, // left
        mats.skinMat, // top
        mats.skinMat, // bottom
        mats.faceMat, // front (Z+)
        mats.skinMat, // back
      ];
      const head = new THREE.Mesh(headGeo, headMats);
      head.name = 'head';
      head.position.set(0, 1.35, 0);
      group.add(head);

      // Torso: width 0.5, height 0.7, depth 0.26
      const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.26);
      const torso = new THREE.Mesh(torsoGeo, mats.torsoMat);
      torso.name = 'torso';
      torso.position.set(0, 0.75, 0);
      group.add(torso);

      // Left Arm: pivot at top (translate geometry)
      const armGeoLeft = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      armGeoLeft.translate(0, -0.35, 0);
      const leftArm = new THREE.Mesh(armGeoLeft, mats.skinMat);
      leftArm.name = 'leftArm';
      leftArm.position.set(-0.35, 1.05, 0);
      leftArm.rotation.x = -Math.PI / 2;
      group.add(leftArm);

      // Right Arm: pivot at top (translate geometry)
      const armGeoRight = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      armGeoRight.translate(0, -0.35, 0);
      const rightArm = new THREE.Mesh(armGeoRight, mats.skinMat);
      rightArm.name = 'rightArm';
      rightArm.position.set(0.35, 1.05, 0);
      rightArm.rotation.x = -Math.PI / 2;
      group.add(rightArm);

      // Left Leg: pivot at top (translate geometry)
      const legGeoLeft = new THREE.BoxGeometry(0.22, 0.7, 0.22);
      legGeoLeft.translate(0, -0.35, 0);
      const leftLeg = new THREE.Mesh(legGeoLeft, mats.pantsMat);
      leftLeg.name = 'leftLeg';
      leftLeg.position.set(-0.13, 0.4, 0);
      group.add(leftLeg);

      // Right Leg: pivot at top (translate geometry)
      const legGeoRight = new THREE.BoxGeometry(0.22, 0.7, 0.22);
      legGeoRight.translate(0, -0.35, 0);
      const rightLeg = new THREE.Mesh(legGeoRight, mats.pantsMat);
      rightLeg.name = 'rightLeg';
      rightLeg.position.set(0.13, 0.4, 0);
      group.add(rightLeg);

      // Cast and receive shadow
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      return group;
    };

    const spawnDroppedItem = (x: number, y: number, z: number, type: BlockType) => {
      const mat = materials[type];
      if (!mat) return;
      
      const mesh = new THREE.Mesh(dropGeometry, mat);
      mesh.position.set(x, y + 0.1, z);
      
      // Random upward/outward pop velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        0.12,
        (Math.random() - 0.5) * 0.08
      );
      
      scene.add(mesh);
      activeDroppedItems.push({
        id: Math.random().toString(),
        mesh,
        type,
        createdAt: performance.now(),
        velocity
      });
    };

    // Build/rebuild visible meshes
    const updateRenderedBlocks = () => {
      // Clear old meshes
      Object.values(meshes).forEach(m => scene.remove(m));
      torchLightsGroup.clear();

      const pX = Math.round(camera.position.x);
      const pY = Math.round(camera.position.y);
      const pZ = Math.round(camera.position.z);
      const viewRadius = settingsRef.current.renderDistance * 16;

      // DYNAMIC INFINITE TERRAIN GENERATION: Generate ungenerated columns on demand
      const newBlocks: Record<string, number> = {};
      let generatedAny = false;
      for (let x = pX - viewRadius; x <= pX + viewRadius; x++) {
        for (let z = pZ - viewRadius; z <= pZ + viewRadius; z++) {
          const colKey = `${x},${z}`;
          if (!generatedColumns.has(colKey)) {
            generatedColumns.add(colKey);
            generateColumn(x, z, newBlocks);
            generatedAny = true;
          }
        }
      }

      if (generatedAny) {
        Object.assign(blocksRef.current, newBlocks);
        onUpdateBlocks(prev => ({ ...prev, ...newBlocks }));
      }

      // Group coords by block type to batch build InstancedMeshes
      const typeCoordinates: Record<number, THREE.Vector3[]> = {};
      Object.values(BLOCK_DETAILS).forEach(details => {
        if (details.type !== BlockType.AIR) {
          typeCoordinates[details.type] = [];
        }
      });

      const currentBlocks = blocksRef.current;

      // Scan local radius around player - limit Y range relative to player position to speed up scan
      const minY = Math.max(-22, pY - 16);
      const maxY = Math.min(32, pY + 16);

      for (let x = pX - viewRadius; x <= pX + viewRadius; x++) {
        for (let z = pZ - viewRadius; z <= pZ + viewRadius; z++) {
          for (let y = minY; y <= maxY; y++) {
            const key = `${x},${y},${z}`;
            const type = currentBlocks[key];

            if (type && type !== BlockType.AIR) {
              // VOXEL OPTIMIZATION: Direct inline face culling / Air check
              // No array instantiation or closures to ensure maximum garbage collection performance and fps
              const tRight = currentBlocks[`${x + 1},${y},${z}`];
              const tLeft = currentBlocks[`${x - 1},${y},${z}`];
              const tUp = currentBlocks[`${x},${y + 1},${z}`];
              const tDown = currentBlocks[`${x},${y - 1},${z}`];
              const tFront = currentBlocks[`${x},${y},${z + 1}`];
              const tBack = currentBlocks[`${x},${y},${z - 1}`];

              const isVisible = 
                (!tRight || tRight === BlockType.AIR || BLOCK_DETAILS[tRight as BlockType]?.isTransparent) ||
                (!tLeft || tLeft === BlockType.AIR || BLOCK_DETAILS[tLeft as BlockType]?.isTransparent) ||
                (!tUp || tUp === BlockType.AIR || BLOCK_DETAILS[tUp as BlockType]?.isTransparent) ||
                (!tDown || tDown === BlockType.AIR || BLOCK_DETAILS[tDown as BlockType]?.isTransparent) ||
                (!tFront || tFront === BlockType.AIR || BLOCK_DETAILS[tFront as BlockType]?.isTransparent) ||
                (!tBack || tBack === BlockType.AIR || BLOCK_DETAILS[tBack as BlockType]?.isTransparent);

              if (isVisible) {
                typeCoordinates[type].push(new THREE.Vector3(x, y, z));

                // If torch, add a local dynamic warm PointLight!
                if (type === BlockType.TORCH) {
                  const light = new THREE.PointLight('#f97316', 1.8, 8, 1.2);
                  light.position.set(x, y + 0.2, z);
                  torchLightsGroup.add(light);
                }
              }
            }
          }
        }
      }

      // Create/update instanced meshes
      Object.keys(typeCoordinates).forEach(keyType => {
        const type = parseInt(keyType) as BlockType;
        const coords = typeCoordinates[type];

        if (coords.length === 0) return;

        const instMesh = new THREE.InstancedMesh(blockGeometry, materials[type], coords.length);
        instMesh.castShadow = type !== BlockType.GLASS && type !== BlockType.LEAVES;
        instMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        coords.forEach((pos, idx) => {
          dummy.position.copy(pos);
          dummy.updateMatrix();
          instMesh.setMatrixAt(idx, dummy.matrix);
        });

        instMesh.instanceMatrix.needsUpdate = true;
        scene.add(instMesh);
        meshes[type] = instMesh;
      });
    };

    updateRenderedBlocks();

    // Trigger map update periodically
    let lastMapUpdatePos = new THREE.Vector3();
    const updateHUDMiniMap = () => {
      const pX = Math.round(camera.position.x);
      const pY = Math.round(camera.position.y);
      const pZ = Math.round(camera.position.z);

      const radius = 7; // 15x15 grid
      const grid: number[][] = [];
      const currentBlocks = blocksRef.current;

      for (let dz = -radius; dz <= radius; dz++) {
        const row: number[] = [];
        for (let dx = -radius; dx <= radius; dx++) {
          const x = pX + dx;
          const z = pZ + dz;
          
          // Let's check a column from height Y, down 3 steps, looking for solid block
          let bType = BlockType.AIR;
          for (let dy = 1; dy >= -4; dy--) {
            const key = `${x},${pY + dy},${z}`;
            const t = currentBlocks[key];
            if (t && t !== BlockType.AIR) {
              bType = t;
              break;
            }
          }
          row.push(bType);
        }
        grid.push(row);
      }

      onUpdateMiniMap(grid);
    };

    updateHUDMiniMap();

    // -------------------------------------------------------------------------
    // 4. KEYBOARD & MOUSE CONTROLS (POINTER LOCK API)
    // -------------------------------------------------------------------------
    const keysPressed: Record<string, boolean> = {};

    const onKeyDown = (e: KeyboardEvent) => {
      if (isPausedRef.current) return;
      keysPressed[e.key.toLowerCase()] = true;

      // Instant hotbar slot switching via numbers
      if (e.key >= '1' && e.key <= '9') {
        const slots: BlockType[] = [
          BlockType.GRASS,
          BlockType.DIRT,
          BlockType.STONE,
          BlockType.PLANK,
          BlockType.GLASS,
          BlockType.TORCH,
          BlockType.COBBLESTONE,
          BlockType.WOOD,
          BlockType.DIAMOND,
        ];
        const selected = slots[parseInt(e.key) - 1];
        if (selected) {
          onUpdateStats(prev => ({ ...prev, selectedBlock: selected }));
          playSound.click(settingsRef.current.soundEnabled);
        }
      }

      // Fly Mode hotkey
      if (e.key.toLowerCase() === 'f') {
        onUpdateStats(prev => {
          const nextFly = !prev.isFlying;
          playSound.jump(settingsRef.current.soundEnabled);
          return { ...prev, isFlying: nextFly };
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };

    // Camera rotation via Pointer Lock
    let pitch = 0;
    let yaw = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (isPausedRef.current || !pointerLockedRef.current) return;

      const sensitivity = 0.0022;
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;

      // Lock looking straight up or straight down
      pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, pitch));

      const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      camera.quaternion.copy(qY).multiply(qX);
    };

    // Pointer Lock events
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setPointerLocked(locked);
      pointerLockedRef.current = locked;
    };

    renderer.domElement.addEventListener('click', () => {
      if (!isMobile && statsRef.current.health > 0) {
        renderer.domElement.requestPointerLock();
      }
    });

    const handleRespawn = (e: Event) => {
      const customEvent = e as CustomEvent;
      const pos = customEvent.detail || { x: 0, y: 15, z: 0 };
      camera.position.set(pos.x, pos.y, pos.z);
      vy = 0;
      peakY = null;
      updateRenderedBlocks();
      updateHUDMiniMap();
    };
    window.addEventListener('game-respawn', handleRespawn);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // -------------------------------------------------------------------------
    // 5. TOUCH CONTROLS FOR MOBILE (SWIPE TO LOOK)
    // -------------------------------------------------------------------------
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (isPausedRef.current || e.touches.length === 0) return;
      // Track touch on the right half of the screen for camera look
      const touch = e.touches[0];
      if (touch.clientX > window.innerWidth / 2) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPausedRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      if (touch.clientX > window.innerWidth / 2) {
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        const sensitivity = 0.005;
        yaw -= dx * sensitivity;
        pitch -= dy * sensitivity;
        pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, pitch));

        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        camera.quaternion.copy(qY).multiply(qX);

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    };

    if (isMobile) {
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
    }

    // -------------------------------------------------------------------------
    // 6. RAYCASTING VOXEL FINDER
    // -------------------------------------------------------------------------
    const getTargetedVoxel = () => {
      // March along camera looking vector
      const step = 0.04;
      const maxReach = 5.2;
      const start = camera.position.clone();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      let lastEmpty: THREE.Vector3 | null = null;

      for (let dist = 0; dist < maxReach; dist += step) {
        const current = start.clone().addScaledVector(dir, dist);
        const vx = Math.round(current.x);
        const vy = Math.round(current.y);
        const vz = Math.round(current.z);

        const key = `${vx},${vy},${vz}`;
        const type = blocksRef.current[key];

        if (type && type !== BlockType.AIR) {
          return {
            targeted: { x: vx, y: vy, z: vz, type },
            adjacent: lastEmpty ? { x: Math.round(lastEmpty.x), y: Math.round(lastEmpty.y), z: Math.round(lastEmpty.z) } : null
          };
        }
        lastEmpty = current;
      }

      return null;
    };

    // Dedicated block-break implementation
    const performBlockBreak = (x: number, y: number, z: number, type: BlockType) => {
      const key = `${x},${y},${z}`;
      const isSurvival = statsRef.current.mode === 'survival';

      // Play dynamic synthesized break sound
      playSound.breakBlock(
        type === BlockType.LEAVES ? 'leaves' : (type >= BlockType.COAL && type <= BlockType.REDSTONE ? 'ore' : 'stone'),
        settingsRef.current.soundEnabled
      );

      // Edit world blocks map
      onUpdateBlocks(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      // Survival collect logic
      if (isSurvival) {
        spawnDroppedItem(x, y, z, type);
      }

      // Sync and force visual meshes update immediately after click
      setTimeout(() => {
        updateRenderedBlocks();
        updateHUDMiniMap();
      }, 30);
    };

    // BREAK AND BUILD CLICK ACTIONS
    const executeAction = (actionType: 'break' | 'place') => {
      if (isPausedRef.current) return;

      if (actionType === 'break') {
        // --- Attack Mob Check ---
        let hitMob: ZombieMob | null = null;
        let minMobDist = 3.8;
        const playerPos = camera.position.clone();
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);

        for (const mob of activeMobs) {
          const mobPos = mob.mesh.position.clone();
          mobPos.y += 0.8; // Target body center
          const toMob = mobPos.clone().sub(playerPos);
          const dist = toMob.length();
          if (dist < minMobDist) {
            toMob.normalize();
            const angleCos = lookDir.dot(toMob);
            if (angleCos > 0.86) { // inside ~30 degrees cone
              hitMob = mob;
              minMobDist = dist;
            }
          }
        }

        if (hitMob) {
          // Attack mob!
          hitMob.health -= 35; // dies in 3 hits!
          hitMob.lastHurtTime = performance.now();
          playSound.zombieHurt(settingsRef.current.soundEnabled);
          
          // Apply knockback: push in looking direction & slightly up
          hitMob.knockbackVelocity.copy(lookDir).multiplyScalar(0.24);
          hitMob.knockbackVelocity.y = 0.12;

          if (hitMob.health <= 0) {
            // Remove from scene and list
            scene.remove(hitMob.mesh);
            const index = activeMobs.indexOf(hitMob);
            if (index > -1) {
              activeMobs.splice(index, 1);
            }
            // Spawn drop
            spawnDroppedItem(hitMob.mesh.position.x, hitMob.mesh.position.y, hitMob.mesh.position.z, BlockType.COAL); // coal represents drop reward!
          }
          return; // Skip block breaking when attacking a mob!
        }
      }

      const target = getTargetedVoxel();
      if (!target) return;

      const selected = statsRef.current.selectedBlock;
      const isSurvival = statsRef.current.mode === 'survival';

      if (actionType === 'break') {
        const { x, y, z, type } = target.targeted;
        performBlockBreak(x, y, z, type as BlockType);
      } else if (actionType === 'place' && target.adjacent) {
        const { x, y, z } = target.adjacent;
        const key = `${x},${y},${z}`;

        // Ensure we don't place where player body is standing!
        const pX = Math.round(camera.position.x);
        const pY = Math.round(camera.position.y);
        const pZ = Math.round(camera.position.z);
        
        const overlapsBody = x === pX && z === pZ && (y === pY || y === pY - 1);
        if (overlapsBody && BLOCK_DETAILS[selected].isSolid) return;

        // Inventory check for survival
        if (isSurvival && (statsRef.current.inventory[selected] || 0) <= 0) {
          return; // No blocks of this type left!
        }

        playSound.placeBlock(settingsRef.current.soundEnabled);

        onUpdateBlocks(prev => {
          const next = { ...prev };
          next[key] = selected;
          return next;
        });

        if (isSurvival) {
          onUpdateStats(prev => {
            const nextInv = { ...prev.inventory };
            nextInv[selected] = Math.max(0, nextInv[selected] - 1);
            return { ...prev, inventory: nextInv };
          });
        }
      }

      // Sync and force visual meshes update immediately after click
      setTimeout(() => {
        updateRenderedBlocks();
        updateHUDMiniMap();
      }, 30);
    };

    // Mining variables
    let isLeftMouseDown = false;
    let isMobileMining = false;
    let miningTarget: { x: number; y: number; z: number; type: BlockType } | null = null;
    let miningProgress = 0; // 0.0 to 1.0
    let lastMiningSoundTime = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (!pointerLockedRef.current && !isMobile) return;
      e.preventDefault();

      if (e.button === 0) {
        isLeftMouseDown = true;
        isMobileMining = false; // Cancel mobile auto-mining if desktop click starts
        
        // In creative mode, break instantly on click
        const target = getTargetedVoxel();
        if (target && statsRef.current.mode === 'creative') {
          performBlockBreak(target.targeted.x, target.targeted.y, target.targeted.z, target.targeted.type as BlockType);
        }
      } else if (e.button === 2) {
        isMobileMining = false; // cancel mining
        executeAction('place');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isLeftMouseDown = false;
      }
    };

    const getBlockHardness = (type: BlockType): number => {
      switch (type) {
        case BlockType.TORCH:
          return 0.05;
        case BlockType.LEAVES:
        case BlockType.GLASS:
          return 0.15;
        case BlockType.DIRT:
        case BlockType.GRASS:
          return 0.4;
        case BlockType.PLANK:
        case BlockType.WOOD:
          return 0.8;
        case BlockType.STONE:
        case BlockType.COBBLESTONE:
          return 1.4;
        case BlockType.COAL:
        case BlockType.IRON:
        case BlockType.GOLD:
        case BlockType.REDSTONE:
          return 1.8;
        case BlockType.DIAMOND:
          return 2.2;
        case BlockType.OBSIDIAN:
          return 4.0;
        default:
          return 0.5;
      }
    };

    const updateMining = (delta: number) => {
      const target = getTargetedVoxel();
      const isSurvival = statsRef.current.mode === 'survival';

      // Check if we should be mining
      const isMiningTriggerActive = isLeftMouseDown || isMobileMining;

      if (!isSurvival || !isMiningTriggerActive || !target) {
        // Clear mining progress
        miningTarget = null;
        miningProgress = 0;
        cracksBox.visible = false;
        return;
      }

      const { x, y, z, type } = target.targeted;

      // If target changed, reset progress
      if (
        !miningTarget ||
        miningTarget.x !== x ||
        miningTarget.y !== y ||
        miningTarget.z !== z
      ) {
        miningTarget = { x, y, z, type: type as BlockType };
        miningProgress = 0;
        lastMiningSoundTime = 0;
      }

      // Increment progress based on hardness
      const hardness = getBlockHardness(type as BlockType);
      const speed = 1 / hardness;
      miningProgress = Math.min(1.0, miningProgress + delta * speed);

      // Play mining crack sound occasionally
      const now = performance.now();
      if (now - lastMiningSoundTime > 250 && miningProgress < 1.0) {
        playSound.breakBlock(
          type === BlockType.LEAVES ? 'leaves' : (type >= BlockType.COAL && type <= BlockType.REDSTONE ? 'ore' : 'stone'),
          settingsRef.current.soundEnabled
        );
        lastMiningSoundTime = now;
      }

      // Update cracking mesh
      const crackTex = getCrackTexture(miningProgress);
      if (crackTex) {
        cracksBox.material.map = crackTex;
        cracksBox.material.needsUpdate = true;
        cracksBox.position.set(x, y, z);
        cracksBox.visible = true;
      } else {
        cracksBox.visible = false;
      }

      // Complete break if progress reaches 1.0
      if (miningProgress >= 1.0) {
        performBlockBreak(x, y, z, type as BlockType);
        miningTarget = null;
        miningProgress = 0;
        cracksBox.visible = false;
        isMobileMining = false;
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // -------------------------------------------------------------------------
    // 7. PHYSICS ENGINE & CORE GAME LOOP
    // -------------------------------------------------------------------------
    let vy = 0; // vertical velocity
    let isGrounded = false;
    let peakY: number | null = null;
    let clock = new THREE.Clock();
    let lastStatsUpdateTime = 0;
    let lastSettingsUpdateTime = 0;
    let lastVoidDamageTime = 0;

    const updateDroppedItems = (delta: number) => {
      const now = performance.now();
      const playerPos = camera.position.clone();
      const playerBodyPos = playerPos.clone();
      playerBodyPos.y -= 1.0; // Estimate player center of mass/feet

      for (let i = activeDroppedItems.length - 1; i >= 0; i--) {
        const item = activeDroppedItems[i];
        
        // Spin
        item.mesh.rotation.y += 0.04;
        item.mesh.rotation.x += 0.02;
        
        // Bobbing floating animation
        const hoverOffset = Math.sin((now - item.createdAt) * 0.005) * 0.002;
        item.mesh.position.y += hoverOffset;

        const dist = item.mesh.position.distanceTo(playerBodyPos);
        
        if (dist < 3.2) {
          // Magnetized: pull towards player
          const flySpeed = 5.5 * delta;
          item.mesh.position.lerp(playerBodyPos, flySpeed);
          
          if (dist < 0.9) {
            // Pick up
            scene.remove(item.mesh);
            activeDroppedItems.splice(i, 1);
            
            // Add to inventory
            onUpdateStats(prev => {
              const nextInv = { ...prev.inventory };
              nextInv[item.type] = (nextInv[item.type] || 0) + 1;
              return { ...prev, inventory: nextInv };
            });

            // Play pick sound
            playSound.click(settingsRef.current.soundEnabled);
            if (item.type === BlockType.DIAMOND) {
              playSound.mineRareOre(settingsRef.current.soundEnabled);
            }

            setTimeout(() => {
              updateRenderedBlocks();
              updateHUDMiniMap();
            }, 30);
            
            continue;
          }
        } else {
          // Normal physics for drop
          item.velocity.y -= 0.006; // gravity
          item.mesh.position.add(item.velocity);
          
          item.velocity.x *= 0.92;
          item.velocity.z *= 0.92;

          // Block collision under item
          const blockX = Math.round(item.mesh.position.x);
          const blockY = Math.round(item.mesh.position.y - 0.12);
          const blockZ = Math.round(item.mesh.position.z);
          const blockKey = `${blockX},${blockY},${blockZ}`;
          const bType = blocksRef.current[blockKey];
          
          if (bType && BLOCK_DETAILS[bType as BlockType].isSolid) {
            item.mesh.position.y = blockY + 0.5 + 0.12;
            item.velocity.set(0, 0, 0);
          }
        }
      }
    };

    let lastMobSpawnTime = 0;
    const updateMobs = (delta: number) => {
      const now = performance.now();
      const pPos = camera.position.clone();
      const currentSettings = settingsRef.current;
      const currentStats = statsRef.current;
      const isNight = currentSettings.dayNightCycle && (currentSettings.timeOfDay >= 7000 && currentSettings.timeOfDay < 17000);

      // Spawning logic (only at night!)
      if (isNight && now - lastMobSpawnTime > 3000 && activeMobs.length < 10 && currentStats.health > 0) {
        lastMobSpawnTime = now;
        
        // Pick random location 18-35 blocks away
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 17;
        const x = Math.round(pPos.x + Math.cos(angle) * dist);
        const z = Math.round(pPos.z + Math.sin(angle) * dist);

        // Get height at (x, z)
        const n = perlin.fbm2D(x * 0.03, z * 0.03, 3, 2.1, 0.45);
        const heightLevel = Math.floor(n * 10 + 12);
        
        // Ensure spawn is within valid elevation bounds
        if (heightLevel >= -19 && heightLevel <= 28) {
          const mobMesh = createZombieMesh(zombieMats);
          mobMesh.position.set(x, heightLevel + 1.1, z); // spawn on top of surface block
          scene.add(mobMesh);

          activeMobs.push({
            id: Math.random().toString(),
            mesh: mobMesh,
            health: 100,
            maxHealth: 100,
            verticalVelocity: 0,
            knockbackVelocity: new THREE.Vector3(),
            lastHurtTime: 0,
            lastAttackTime: 0
          });

          // Play zombie spawn growl
          playSound.zombieGrowl(currentSettings.soundEnabled);
        }
      }

      // Update active mobs
      for (let i = activeMobs.length - 1; i >= 0; i--) {
        const mob = activeMobs[i];
        const mPos = mob.mesh.position.clone();
        const distToPlayer = mPos.distanceTo(pPos);

        // 1. Despawn if too far away (> 50 blocks)
        if (distToPlayer > 50) {
          scene.remove(mob.mesh);
          activeMobs.splice(i, 1);
          continue;
        }

        // 2. Burning during daytime!
        if (!isNight) {
          const burnRand = Math.random();
          if (burnRand > 0.985) {
            playSound.zombieBurn(currentSettings.soundEnabled);
          }
          // Reduce health
          mob.health -= 12 * delta; // takes ~8 seconds to burn to death
          mob.lastHurtTime = now; // keep red flash flashing
          
          if (mob.health <= 0) {
            scene.remove(mob.mesh);
            activeMobs.splice(i, 1);
            // Spawn some Rotten Flesh drops (represented by wood block)
            spawnDroppedItem(mPos.x, mPos.y, mPos.z, BlockType.WOOD);
            continue;
          }
        }

        // 3. Move and direct mob towards player if alive
        if (currentStats.health > 0) {
          const dirToPlayer = pPos.clone().sub(mPos);
          dirToPlayer.y = 0; // Flat horizontal direction
          const flatDist = dirToPlayer.length();

          if (flatDist > 0.1) {
            dirToPlayer.normalize();

            // Face the player
            mob.mesh.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);

            // Calculate walk velocity
            const walkSpeed = 1.6; // speed units/sec
            const vel = dirToPlayer.clone().multiplyScalar(walkSpeed * delta);

            // Gravity & Vertical Physics
            mob.verticalVelocity -= 0.012; // gravity pull
            if (mob.verticalVelocity < -0.45) mob.verticalVelocity = -0.45;

            const nextX = mPos.x + vel.x + mob.knockbackVelocity.x;
            const nextZ = mPos.z + vel.z + mob.knockbackVelocity.z;
            const nextY = mPos.y + mob.verticalVelocity;

            // Apply friction/decay to knockback
            mob.knockbackVelocity.multiplyScalar(0.85);
            if (mob.knockbackVelocity.length() < 0.01) {
              mob.knockbackVelocity.set(0, 0, 0);
            }

            // Simple Collision & Jump Over Blocks
            const testX = Math.round(nextX);
            const testZ = Math.round(nextZ);

            // Ground snap
            let isMobGrounded = false;
            const checkFeetBlock = blocksRef.current[`${testX},${Math.floor(nextY - 0.5)},${testZ}`];
            if (checkFeetBlock && BLOCK_DETAILS[checkFeetBlock as BlockType]?.isSolid) {
              mob.mesh.position.y = Math.floor(nextY - 0.5) + 1.5;
              mob.verticalVelocity = 0;
              isMobGrounded = true;
            } else {
              mob.mesh.position.y = nextY;
            }

            // Jump over obstacles!
            const blockInFrontLeg = blocksRef.current[`${testX},${Math.round(mPos.y - 0.2)},${testZ}`];
            const blockInFrontHead = blocksRef.current[`${testX},${Math.round(mPos.y + 0.8)},${testZ}`];
            if (blockInFrontLeg && BLOCK_DETAILS[blockInFrontLeg as BlockType]?.isSolid) {
              if (isMobGrounded && (!blockInFrontHead || !BLOCK_DETAILS[blockInFrontHead as BlockType]?.isSolid)) {
                mob.verticalVelocity = 0.16; // Jump!
              }
            }

            // Move X & Z
            mob.mesh.position.x = nextX;
            mob.mesh.position.z = nextZ;

            // 4. Attack player if close enough (< 1.4 blocks) and in survival mode
            if (currentStats.mode === 'survival' && distToPlayer < 1.4 && now - mob.lastAttackTime > 1200) {
              mob.lastAttackTime = now;
              // Deal damage
              onUpdateStats(prev => ({
                ...prev,
                health: Math.max(0, prev.health - 12)
              }));
              playSound.hurt(currentSettings.soundEnabled);
              
              // Mob jump attack jump effect
              mob.verticalVelocity = 0.08;
            }
          }
        }

        // 5. Red hurt damage flash
        const isHurt = now - mob.lastHurtTime < 250;
        mob.mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat && 'color' in mat) {
                if (isHurt) {
                  mat.color.setHex(0xff3333);
                } else {
                  mat.color.setHex(0xffffff);
                }
              }
            });
          }
        });

        // 6. Limb walking animation
        const leftLeg = mob.mesh.getObjectByName('leftLeg');
        const rightLeg = mob.mesh.getObjectByName('rightLeg');
        if (leftLeg && rightLeg) {
          const swingSpeed = 6.0;
          const angle = Math.sin(now * 0.001 * swingSpeed) * 0.55;
          leftLeg.rotation.x = angle;
          rightLeg.rotation.x = -angle;
        }

        // Subtle head bobbing
        const head = mob.mesh.getObjectByName('head');
        if (head) {
          head.rotation.y = Math.sin(now * 0.001 * 3.0) * 0.1;
        }

        // Occasional zombie vocal growl sounds
        if (Math.random() > 0.9982) {
          playSound.zombieGrowl(currentSettings.soundEnabled);
        }
      }
    };

    const animate = () => {
      requestAnimationFrame(animate);

      if (isPausedRef.current) return;

      const delta = clock.getDelta();
      updateMining(delta);
      updateDroppedItems(delta);
      updateMobs(delta);
      const currentStats = statsRef.current;
      const currentSettings = settingsRef.current;
      const now = performance.now();
      
      // Dynamic Day/Night Cycle speed
      if (currentSettings.dayNightCycle) {
        const t = currentSettings.timeOfDay;
        // Day/sunrise/sunset (17000-24000 and 0-7000) totals 14000 units. We want this to take exactly 10 minutes (600 seconds).
        // Night (7000-17000) totals 10000 units. We want this to take exactly 10 minutes (600 seconds).
        const unitsPerSecond = (t >= 7000 && t < 17000)
          ? (10000 / 600) // Night: 10 minutes
          : (14000 / 600); // Day/Sunset/Sunrise: 10 minutes
        
        // Advance timeOfDay based on delta time and cycleSpeed multiplier
        currentSettings.timeOfDay = (currentSettings.timeOfDay + delta * unitsPerSecond * currentSettings.cycleSpeed) % 24000;
        
        // Throttled React state dispatch to avoid heavy rendering lag
        if (now - lastSettingsUpdateTime > 500) {
          onUpdateSettings(prev => ({
            ...prev,
            timeOfDay: currentSettings.timeOfDay
          }));
          lastSettingsUpdateTime = now;
        }
      }
      
      // Adjust directional light colors based on current timeOfDay
      const t = currentSettings.timeOfDay;
        let skyColor = '#7dd3fc';
        let lightIntensity = 0.8;

        if (t >= 5000 && t < 7000) { // Sunset
          const ratio = (t - 5000) / 2000;
          skyColor = new THREE.Color('#7dd3fc').lerp(new THREE.Color('#f97316'), ratio).getStyle();
          lightIntensity = THREE.MathUtils.lerp(0.8, 0.2, ratio);
          scene.background = new THREE.Color(skyColor);
          scene.fog = new THREE.FogExp2(skyColor, 0.03);
        } else if (t >= 7000 && t < 17000) { // Night
          skyColor = '#0f172a';
          lightIntensity = 0.08;
          scene.background = new THREE.Color(skyColor);
          scene.fog = new THREE.FogExp2(skyColor, 0.04);
        } else if (t >= 17000 && t < 19000) { // Sunrise
          const ratio = (t - 17000) / 2000;
          skyColor = new THREE.Color('#0f172a').lerp(new THREE.Color('#7dd3fc'), ratio).getStyle();
          lightIntensity = THREE.MathUtils.lerp(0.08, 0.8, ratio);
          scene.background = new THREE.Color(skyColor);
          scene.fog = new THREE.FogExp2(skyColor, 0.03);
        } else { // Day
          skyColor = '#7dd3fc';
          lightIntensity = 0.85;
          scene.background = new THREE.Color(skyColor);
          scene.fog = new THREE.FogExp2(skyColor, 0.03);
        }
        
        sunLight.intensity = lightIntensity;

      // Cave depth lighting effect - the deeper we dig, the darker it gets!
      const playerY = camera.position.y;
      if (playerY < 6) {
        // Slowly dim ambient light and make fog pitch black
        const darkRatio = Math.max(0, Math.min(1, (6 - playerY) / 10)); // 1 is fully dark cave
        
        ambientLight.intensity = THREE.MathUtils.lerp(0.55, 0.08, darkRatio);
        
        // Darken fog and sky background to black
        const originalSky = new THREE.Color(scene.background as THREE.Color);
        const targetSky = new THREE.Color('#09090b'); // pitch black cave fog
        const blendedSky = originalSky.lerp(targetSky, darkRatio);
        renderer.setClearColor(blendedSky);
        scene.fog = new THREE.FogExp2(blendedSky, 0.05 + darkRatio * 0.08);

        // Turn on retro low cave ambient wind hum!
        if (currentSettings.soundEnabled && playerY < 4) {
          try {
            playSound.startCaveAmbiance(true);
          } catch(e){}
        }
      } else {
        // Reset to normal daylight parameters
        ambientLight.intensity = 0.55;
        playSound.stopCaveAmbiance();
      }

      // ---------------- Physics Resolution ----------------
      // Force non-flying in survival mode
      if (currentStats.mode === 'survival' && currentStats.isFlying) {
        onUpdateStats(prev => ({ ...prev, isFlying: false }));
        currentStats.isFlying = false;
      }

      // Track peak height for fall damage
      if (currentStats.mode === 'survival' && !currentStats.isFlying && !isGrounded) {
        if (peakY === null || camera.position.y > peakY) {
          peakY = camera.position.y;
        }
      } else {
        peakY = null;
      }

      const moveSpeed = currentSettings.superSpeed ? 0.16 : 0.075;
      const flySpeed = currentSettings.superSpeed ? 0.22 : 0.12;
      const moveDirection = new THREE.Vector3();

      // Keyboard Inputs
      if (keysPressed['w'] || keysPressed['arrowup']) moveDirection.z -= 1;
      if (keysPressed['s'] || keysPressed['arrowdown']) moveDirection.z += 1;
      if (keysPressed['a'] || keysPressed['arrowleft']) moveDirection.x -= 1;
      if (keysPressed['d'] || keysPressed['arrowright']) moveDirection.x += 1;

      // Mobile Joystick Inputs
      if (isMobile && joystickRef.current) {
        moveDirection.x = joystickRef.current.x;
        moveDirection.z = joystickRef.current.y;
      }

      moveDirection.normalize();

      // Transform direction into Camera look space
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      // Flatten vectors to stay horizontal
      forward.y = 0;
      forward.normalize();
      right.y = 0;
      right.normalize();

      const desiredVelocity = new THREE.Vector3()
        .addScaledVector(forward, -moveDirection.z)
        .addScaledVector(right, moveDirection.x);

      // Scale movement
      const speed = currentStats.isFlying ? flySpeed : moveSpeed;
      desiredVelocity.multiplyScalar(speed);

      // Handle vertical climbing in fly mode
      let vyChange = 0;
      if (currentStats.isFlying) {
        if (keysPressed[' '] || keysPressed['space']) vyChange = speed;
        if (keysPressed['shift']) vyChange = -speed;
      }

      // ---------------- Simple Gravitational Physics ----------------
      if (currentSettings.gravityEnabled && !currentStats.isFlying) {
        vy -= 0.012; // gravity pull
        if (vy < -0.45) vy = -0.45; // terminal velocity
      } else {
        vy = vyChange; // slide vertical in fly mode
      }

      // Apply vertical jump command
      if (!currentStats.isFlying && isGrounded && (keysPressed[' '] || keysPressed['space'])) {
        vy = 0.18; // jump impulse
        isGrounded = false;
        playSound.jump(currentSettings.soundEnabled);
      }

      // Calculate next desired positions
      const nextPos = camera.position.clone();
      nextPos.x += desiredVelocity.x;
      nextPos.z += desiredVelocity.z;
      nextPos.y += vy;

      // --- Collision resolution (Check 8 surrounding columns) ---
      const resolveCollisions = (pos: THREE.Vector3, oldPos: THREE.Vector3) => {
        // Player Bounding Box size (height 1.8, width 0.5)
        const radius = 0.28;

        // Check body and head elevations relative to camera Y (exclude floor beneath feet)
        const testYLevels = [-1.0, 0.0];

        // 1. Check & Resolve X collision
        let collisionX = false;
        for (const dy of testYLevels) {
          const testY = Math.round(oldPos.y + dy);
          const testX = Math.round(pos.x + Math.sign(pos.x - oldPos.x) * radius);
          const testZ = Math.round(oldPos.z);
          const blockKey = `${testX},${testY},${testZ}`;
          const bType = blocksRef.current[blockKey];
          
          if (bType && BLOCK_DETAILS[bType as BlockType].isSolid) {
            collisionX = true;
            break;
          }
        }
        if (collisionX) {
          pos.x = oldPos.x; // Block movement along X
        }

        // 2. Check & Resolve Z collision
        let collisionZ = false;
        for (const dy of testYLevels) {
          const testY = Math.round(oldPos.y + dy);
          const testX = Math.round(pos.x);
          const testZ = Math.round(pos.z + Math.sign(pos.z - oldPos.z) * radius);
          const blockKey = `${testX},${testY},${testZ}`;
          const bType = blocksRef.current[blockKey];

          if (bType && BLOCK_DETAILS[bType as BlockType].isSolid) {
            collisionZ = true;
            break;
          }
        }
        if (collisionZ) {
          pos.z = oldPos.z; // Block movement along Z
        }

        // 3. Check & Resolve Y collision (Grounded or ceiling ceiling)
        isGrounded = false;
        if (vy < 0) {
          // Downward falling check - Stable Math.round(pos.y - 1.5) to avoid infinite vibration
          const feetY = Math.round(pos.y - 1.5);
          const testX = Math.round(pos.x);
          const testZ = Math.round(pos.z);
          const blockKey = `${testX},${feetY},${testZ}`;
          const bType = blocksRef.current[blockKey];

          if (bType && BLOCK_DETAILS[bType as BlockType].isSolid) {
            pos.y = feetY + 1.62; // Snap feet to block top surface
            vy = 0;
            isGrounded = true;

            // Resolve fall damage
            if (currentStats.mode === 'survival' && peakY !== null) {
              const fallDistance = peakY - pos.y;
              if (fallDistance >= 4.0) {
                const damage = Math.round((fallDistance - 3) * 10);
                if (damage > 0) {
                  onUpdateStats(prev => ({
                    ...prev,
                    health: Math.max(0, prev.health - damage)
                  }));
                  playSound.hurt(currentSettings.soundEnabled);
                }
              }
              peakY = null; // Reset peak
            }

            // Damage / Fall injury checks in survival
            if (currentStats.mode === 'survival' && currentStats.health < 100 && rng.range(0, 100) > 99.8) {
              onUpdateStats(prev => ({ ...prev, health: Math.min(100, prev.health + 1) }));
            }
          }
        } else if (vy > 0) {
          // Head bump check
          const headY = Math.round(pos.y + 0.5);
          const testX = Math.round(pos.x);
          const testZ = Math.round(pos.z);
          const blockKey = `${testX},${headY},${testZ}`;
          const bType = blocksRef.current[blockKey];

          if (bType && BLOCK_DETAILS[bType as BlockType].isSolid) {
            pos.y = oldPos.y; // block head movement
            vy = 0;
          }
        }
      };

      if (currentSettings.gravityEnabled && !currentStats.isFlying) {
        resolveCollisions(nextPos, camera.position);
      }

      // Hard clamp map bounds to avoid endless voids
      nextPos.y = Math.max(-19.5, Math.min(30, nextPos.y));

      // Apply coordinates update
      camera.position.copy(nextPos);

      // Update HUD DOM elements directly in the animation loop for buttery smooth 60fps display feedback
      const xyzEl = document.getElementById('hud-xyz-coords');
      const biomeEl = document.getElementById('hud-biome-name');
      const depthEl = document.getElementById('hud-current-depth');
      if (xyzEl) {
        xyzEl.textContent = `XYZ: ${camera.position.x.toFixed(1)} / ${camera.position.y.toFixed(1)} / ${camera.position.z.toFixed(1)}`;
      }
      if (biomeEl) {
        biomeEl.textContent = `Biome: ${camera.position.y < 5 ? 'Deepslate Caverns' : 'Emerald Plains'}`;
      }
      if (depthEl) {
        depthEl.textContent = `LEVEL ${Math.floor(camera.position.y)}`;
      }

      // Void damage when falling out of the world
      if (currentStats.mode === 'survival' && camera.position.y < -35) {
        if (now - lastVoidDamageTime > 1000) {
          onUpdateStats(prev => ({
            ...prev,
            health: Math.max(0, prev.health - 25)
          }));
          playSound.hurt(currentSettings.soundEnabled);
          lastVoidDamageTime = now;
        }
      }

      // Dispatch coordinate stats to parent state slowly (every 1500ms) for background saving, eliminating React re-render stutters
      if (now - lastStatsUpdateTime > 1500) {
        if (Math.abs(camera.position.x - currentStats.position.x) > 0.1 ||
            Math.abs(camera.position.y - currentStats.position.y) > 0.1 ||
            Math.abs(camera.position.z - currentStats.position.z) > 0.1) {
          onUpdateStats(prev => ({
            ...prev,
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
          }));
          lastStatsUpdateTime = now;
        }
      }

      // Rebuild visible chunks column on large movements
      const lastCamPos = new THREE.Vector3(lastMapUpdatePos.x, lastMapUpdatePos.y, lastMapUpdatePos.z);
      if (camera.position.distanceTo(lastCamPos) > 8.0) {
        updateRenderedBlocks();
        updateHUDMiniMap();
        lastMapUpdatePos.copy(camera.position);
      }

      // Update targeted block wireframe outline box
      const target = getTargetedVoxel();
      const bannerEl = document.getElementById('hud-interaction-banner');
      const textEl = document.getElementById('hud-interaction-text');
      if (target) {
        targetBox.position.set(target.targeted.x, target.targeted.y, target.targeted.z);
        targetBox.visible = true;
        if (bannerEl && textEl) {
          bannerEl.style.display = 'flex';
          const blockInfo = BLOCK_DETAILS[target.targeted.type as BlockType];
          textEl.textContent = `採掘 ${blockInfo?.name || '方塊'}`;
        }
      } else {
        targetBox.visible = false;
        if (bannerEl) {
          bannerEl.style.display = 'none';
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // -------------------------------------------------------------------------
    // 8. ASYNC MOBILE BUTTON ACTIONS TRIGGER HANDLERS
    // -------------------------------------------------------------------------
    const handleMobileActions = () => {
      if (!mobileAction) return;

      if (mobileAction === 'break') {
        const target = getTargetedVoxel();
        if (target) {
          if (statsRef.current.mode === 'creative') {
            performBlockBreak(target.targeted.x, target.targeted.y, target.targeted.z, target.targeted.type as BlockType);
          } else {
            isMobileMining = true; // Trigger auto-mining on survival mode
          }
        }
      } else if (mobileAction === 'place') {
        isMobileMining = false; // Cancel mining
        executeAction('place');
      } else if (mobileAction === 'jump') {
        // Trigger temporary jump keystroke
        keysPressed[' '] = true;
        setTimeout(() => { keysPressed[' '] = false; }, 150);
      } else if (mobileAction === 'sneak') {
        // Toggle flying downwards or crouching
        keysPressed['shift'] = true;
        setTimeout(() => { keysPressed['shift'] = false; }, 200);
      } else if (mobileAction === 'fly') {
        onUpdateStats(prev => {
          const nextFly = !prev.isFlying;
          playSound.jump(settingsRef.current.soundEnabled);
          return { ...prev, isFlying: nextFly };
        });
      }

      onClearMobileAction();
    };

    // -------------------------------------------------------------------------
    // 9. EVENT LISTENERS SYNC & RESIZE CLEANUP
    // -------------------------------------------------------------------------
    const onWindowResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onWindowResize);

    // Keep checking mobile trigger signals
    const checkMobileInterval = setInterval(handleMobileActions, 60);

    return () => {
      // Clean up meshes & scene objects
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('game-respawn', handleRespawn);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      
      if (isMobile) {
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
      }

      clearInterval(checkMobileInterval);
      playSound.stopCaveAmbiance();

      try {
        container.removeChild(renderer.domElement);
      } catch (e) {}

      blockGeometry.dispose();
      Object.values(materials).forEach(m => {
        if (Array.isArray(m)) {
          m.forEach(subMat => {
            if ((subMat as any).map) (subMat as any).map.dispose();
            subMat.dispose();
          });
        } else if (m) {
          if ((m as any).map) (m as any).map.dispose();
          m.dispose();
        }
      });
      targetGeo.dispose();
      targetMat.dispose();
      cracksGeo.dispose();
      cracksMat.dispose();
      dropGeometry.dispose();
      activeDroppedItems.forEach(item => {
        scene.remove(item.mesh);
      });
      activeMobs.forEach(mob => {
        scene.remove(mob.mesh);
      });
      if (zombieMats) {
        zombieMats.skinMat.map?.dispose();
        zombieMats.skinMat.dispose();
        zombieMats.faceMat.map?.dispose();
        zombieMats.faceMat.dispose();
        zombieMats.torsoMat.map?.dispose();
        zombieMats.torsoMat.dispose();
        zombieMats.pantsMat.map?.dispose();
        zombieMats.pantsMat.dispose();
      }
      crackTextures.forEach(t => t.dispose());
      renderer.dispose();
    };
  }, [seed, isMobile]); // Rebuild 3D engine only on seed switch or mobile mode toggle

  // Detect and apply hot-rebuilt render distance or settings updates immediately
  useEffect(() => {
    // If settings change, we can force recalculate visible block types!
  }, [settings.renderDistance]);

  const handleRequestLock = () => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
  };

  return (
    <div id="canvas-container" className="relative w-full h-full cursor-pointer overflow-hidden">
      {/* 3D WebGL Element Mount point */}
      <div id="webgl-canvas-mount" ref={mountRef} className="w-full h-full" />

      {/* Crosshair target indicator */}
      {!isPaused && !isMobile && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 relative flex items-center justify-center">
            <div className="absolute w-3 h-0.5 bg-white/70" />
            <div className="absolute w-0.5 h-3 bg-white/70" />
          </div>
        </div>
      )}

      {/* Crosshair target indicator for mobile (larger screen tap helper) */}
      {!isPaused && isMobile && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 border-2 border-dashed border-cyan-400/40 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full" />
          </div>
        </div>
      )}

      {/* Desktop click instructions helper block */}
      {!pointerLocked && !isPaused && !isMobile && (
        <div 
          onClick={handleRequestLock}
          className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center pointer-events-auto cursor-pointer"
        >
          <div 
            className="bg-[#2e2e2e] border-[4px] border-[#1a1a1a] rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] p-6 text-center max-w-sm w-full mx-4 flex flex-col items-center gap-4 animate-fade-in" 
            onClick={e => e.stopPropagation()}
          >
            <Compass className="w-10 h-10 text-yellow-500 mb-1 animate-pulse" />
            <h3 
              className="font-pixel text-yellow-300 text-sm md:text-base leading-tight uppercase select-none"
              style={{
                textShadow: `
                  -1.5px -1.5px 0 #000,  
                   1.5px -1.5px 0 #000,
                  -1.5px  1.5px 0 #000,
                   1.5px  1.5px 0 #000,
                   0px  2px 0 #555,
                   0px  3px 0 #000
                `
              }}
            >
              鎖定滑鼠視角
            </h3>
            <p className="text-zinc-300 font-vt text-lg leading-relaxed select-none">
              請點擊此處「啟動視角控制」，即可使用滑鼠旋轉方向，並用鍵盤 <strong className="text-yellow-400 font-extrabold font-mono">WASD</strong> 移動！
            </p>
            <button 
              onClick={handleRequestLock}
              className="w-full border-[3px] border-zinc-900 bg-[#3c8527] hover:bg-[#479a2f] active:bg-[#2d631d] text-white font-extrabold text-base md:text-lg py-3 px-6 shadow-[inset_3px_3px_0px_#5ea33a,inset_-3px_-3px_0px_#1f4e11] rounded-[4px] outline outline-[3px] outline-white outline-offset-1 cursor-pointer transition-all duration-75 select-none font-vt tracking-wider active:scale-95 text-center"
              style={{
                textShadow: '1px 1px 0px rgba(0,0,0,0.8)'
              }}
            >
              進入遊戲世界
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
