import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Monitor,
  Heart,
  Volume2,
  Trash2,
} from 'lucide-react';
import { BlockType, PlayerStats, GameSettings, WorldSave } from './types';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import Joystick from './components/Joystick';
import { playSound } from './utils/audio';

// Local storage key helper
const STORAGE_KEY = 'cavecraft_saved_worlds';

export default function App() {
  // Screen States: 'menu' | 'playing'
  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');

  // Multi-world storage state
  const [worlds, setWorlds] = useState<WorldSave[]>([]);
  const [currentWorldId, setCurrentWorldId] = useState<string>('');

  // active game runtime states
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    oxygen: 100,
    mode: 'survival',
    inventory: {
      [BlockType.AIR]: 0,
      [BlockType.GRASS]: 64,
      [BlockType.DIRT]: 64,
      [BlockType.STONE]: 64,
      [BlockType.PLANK]: 64,
      [BlockType.GLASS]: 32,
      [BlockType.TORCH]: 16,
      [BlockType.COBBLESTONE]: 64,
      [BlockType.WOOD]: 32,
      [BlockType.LEAVES]: 0,
      [BlockType.COAL]: 0,
      [BlockType.IRON]: 0,
      [BlockType.GOLD]: 0,
      [BlockType.DIAMOND]: 0,
      [BlockType.REDSTONE]: 0,
      [BlockType.OBSIDIAN]: 0,
    },
    selectedBlock: BlockType.GRASS,
    position: { x: 0, y: 15, z: 0 },
    isFlying: false,
  });

  const [settings, setSettings] = useState<GameSettings>({
    renderDistance: 2, // chunks
    showMinimap: true,
    dayNightCycle: true,
    cycleSpeed: 1.0,
    soundEnabled: true,
    gravityEnabled: true,
    superSpeed: false,
    timeOfDay: 1000, // daytime
    fov: 75,
  });

  const [worldBlocks, setWorldBlocks] = useState<Record<string, number>>({});
  const [gamePaused, setGamePaused] = useState<boolean>(false);

  // HUD Minimap 2D horizontal slice state
  const [miniMapGrid, setMiniMapGrid] = useState<number[][]>(() => 
    Array.from({ length: 15 }, () => Array(15).fill(0))
  );

  // Touch control mobile states
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileJoystick, setMobileJoystick] = useState<{ x: number; y: number } | null>(null);
  const [mobileAction, setMobileAction] = useState<'break' | 'place' | 'jump' | 'sneak' | 'fly' | null>(null);

  // Menu specific creation states
  const [menuWorldName, setMenuWorldName] = useState('我的新世界');
  const [menuSeed, setMenuSeed] = useState('');
  const [menuMode, setMenuMode] = useState<'survival' | 'creative'>('survival');

  // Detect touch device on start
  useEffect(() => {
    const checkMobile = () => {
      const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const widthCheck = window.innerWidth < 1024;
      setIsMobile(touchCheck || widthCheck);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. BOOTSTRAP INITIAL PRE-MADE WORLDS IF STORAGE IS EMPTY
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WorldSave[];
        if (parsed.length > 0) {
          setWorlds(parsed);
          setCurrentWorldId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to parse worlds', e);
      }
    }

    // Bootstrap preset worlds!
    const defaultWorlds: WorldSave[] = [
      {
        id: 'natural_hills',
        name: '⛰️ 綠意山丘與河谷',
        seed: '9999',
        blocks: {}, // procedurally generated on load
        playerStats: {
          health: 100,
          oxygen: 100,
          mode: 'survival',
          inventory: {
            [BlockType.AIR]: 0,
            [BlockType.GRASS]: 64,
            [BlockType.DIRT]: 64,
            [BlockType.STONE]: 32,
            [BlockType.PLANK]: 16,
            [BlockType.GLASS]: 10,
            [BlockType.TORCH]: 8,
            [BlockType.COBBLESTONE]: 0,
            [BlockType.WOOD]: 0,
            [BlockType.LEAVES]: 0,
            [BlockType.COAL]: 0,
            [BlockType.IRON]: 0,
            [BlockType.GOLD]: 0,
            [BlockType.DIAMOND]: 0,
            [BlockType.REDSTONE]: 0,
            [BlockType.OBSIDIAN]: 0,
          },
          selectedBlock: BlockType.GRASS,
          position: { x: 0, y: 16, z: 0 },
        },
        settings: {
          renderDistance: 2,
          showMinimap: true,
          dayNightCycle: true,
          cycleSpeed: 0.8,
          soundEnabled: true,
          gravityEnabled: true,
          superSpeed: false,
          timeOfDay: 1000,
          fov: 75,
        },
        createdAt: Date.now(),
      },
      {
        id: 'deep_caves_exp',
        name: '💎 地底深淵巨型礦道',
        seed: 'cave_master_88',
        blocks: {},
        playerStats: {
          health: 100,
          oxygen: 100,
          mode: 'survival',
          inventory: {
            [BlockType.AIR]: 0,
            [BlockType.GRASS]: 0,
            [BlockType.DIRT]: 16,
            [BlockType.STONE]: 0,
            [BlockType.PLANK]: 64,
            [BlockType.GLASS]: 16,
            [BlockType.TORCH]: 32, // More torches for caves!
            [BlockType.COBBLESTONE]: 32,
            [BlockType.WOOD]: 0,
            [BlockType.LEAVES]: 0,
            [BlockType.COAL]: 5,
            [BlockType.IRON]: 2,
            [BlockType.GOLD]: 0,
            [BlockType.DIAMOND]: 0,
            [BlockType.REDSTONE]: 0,
            [BlockType.OBSIDIAN]: 0,
          },
          selectedBlock: BlockType.TORCH,
          position: { x: 0, y: -4, z: 0 }, // Starts underground inside a cave!
        },
        settings: {
          renderDistance: 2,
          showMinimap: true,
          dayNightCycle: true,
          cycleSpeed: 0.5,
          soundEnabled: true,
          gravityEnabled: true,
          superSpeed: false,
          timeOfDay: 14000, // Starts at night
          fov: 75,
        },
        createdAt: Date.now() - 10000,
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorlds));
    setWorlds(defaultWorlds);
    setCurrentWorldId(defaultWorlds[0].id);
  }, []);

  // Save current active world state back into worlds array & localStorage
  const saveWorldState = (targetId = currentWorldId) => {
    if (!targetId) return;

    setWorlds(prevWorlds => {
      const updated = prevWorlds.map(w => {
        if (w.id === targetId) {
          return {
            ...w,
            blocks: worldBlocks,
            playerStats: {
              health: playerStats.health,
              oxygen: playerStats.oxygen,
              mode: playerStats.mode,
              inventory: playerStats.inventory,
              selectedBlock: playerStats.selectedBlock,
              position: playerStats.position,
            },
            settings: settings,
          };
        }
        return w;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Keyboard shortcut for pausing (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      if (e.key === 'Escape') {
        playSound.click(settings.soundEnabled);
        setGamePaused(prev => {
          const next = !prev;
          // Auto-save on pausing
          if (next) saveWorldState();
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, worldBlocks, playerStats, settings]);

  // Load a world state into active game
  const handleLoadWorld = (id: string) => {
    const world = worlds.find(w => w.id === id);
    if (!world) return;

    playSound.click(settings.soundEnabled);
    setCurrentWorldId(id);
    setWorldBlocks(world.blocks || {});
    setPlayerStats({
      ...world.playerStats,
      isFlying: world.playerStats.mode === 'creative',
    });
    setSettings(world.settings);
    setScreen('playing');
    setGamePaused(false);
  };

  // Create new world
  const handleCreateNewWorld = (name: string, seed: string, mode: 'survival' | 'creative' = 'survival') => {
    const newId = `world_${Date.now()}`;
    const newWorld: WorldSave = {
      id: newId,
      name: name,
      seed: seed,
      blocks: {},
      playerStats: {
        health: 100,
        oxygen: 100,
        mode: mode,
        inventory: {
          [BlockType.AIR]: 0,
          [BlockType.GRASS]: 64,
          [BlockType.DIRT]: 64,
          [BlockType.STONE]: 64,
          [BlockType.PLANK]: 64,
          [BlockType.GLASS]: 32,
          [BlockType.TORCH]: 16,
          [BlockType.COBBLESTONE]: 64,
          [BlockType.WOOD]: 32,
          [BlockType.LEAVES]: 0,
          [BlockType.COAL]: 0,
          [BlockType.IRON]: 0,
          [BlockType.GOLD]: 0,
          [BlockType.DIAMOND]: 0,
          [BlockType.REDSTONE]: 0,
          [BlockType.OBSIDIAN]: 0,
        },
        selectedBlock: BlockType.GRASS,
        position: { x: 0, y: 15, z: 0 },
      },
      settings: {
        renderDistance: 2,
        showMinimap: true,
        dayNightCycle: true,
        cycleSpeed: 1.0,
        soundEnabled: settings.soundEnabled,
        gravityEnabled: true,
        superSpeed: false,
        timeOfDay: 1000,
        fov: 75,
      },
      createdAt: Date.now(),
    };

    const updated = [newWorld, ...worlds];
    setWorlds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Immediately play the new world
    playSound.click(settings.soundEnabled);
    setCurrentWorldId(newId);
    setWorldBlocks({});
    setPlayerStats({
      ...newWorld.playerStats,
      isFlying: mode === 'creative',
    });
    setSettings(newWorld.settings);
    setScreen('playing');
    setGamePaused(false);
  };

  // Delete World
  const handleDeleteWorld = (id: string) => {
    const filtered = worlds.filter(w => w.id !== id);
    setWorlds(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (currentWorldId === id && filtered.length > 0) {
      setCurrentWorldId(filtered[0].id);
    }
  };

  // Export World to share code
  const handleExportWorld = () => {
    const currentWorld = worlds.find(w => w.id === currentWorldId);
    if (!currentWorld) return '';
    
    // Package into neat compressed-like JSON block
    const data = {
      ...currentWorld,
      blocks: worldBlocks,
      playerStats: {
        ...playerStats,
        isFlying: undefined, // skip transient fly state
      }
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  };

  // Import World from share code
  const handleImportWorld = (b64Code: string) => {
    try {
      const decoded = decodeURIComponent(escape(atob(b64Code)));
      const parsed = JSON.parse(decoded) as WorldSave;
      
      if (!parsed.id || !parsed.name || !parsed.seed) return false;

      // Ensure unique ID
      parsed.id = `imported_${Date.now()}`;
      parsed.name = `📥 [匯入] ${parsed.name}`;
      
      const updated = [parsed, ...worlds];
      setWorlds(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      // Auto-load it!
      handleLoadWorld(parsed.id);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Reset current active map (removes customized blocks, keeps initial seed structure)
  const handleResetWorld = () => {
    setWorldBlocks({});
    setPlayerStats(prev => ({
      ...prev,
      position: { x: 0, y: 16, z: 0 },
      isFlying: prev.mode === 'creative'
    }));
  };

  // Mobile virtual stick triggers
  const handleJoystickMove = (data: { x: number; y: number }) => {
    setMobileJoystick(data);
  };

  const handleJoystickEnd = () => {
    setMobileJoystick(null);
  };

  const activeWorld = worlds.find(w => w.id === currentWorldId);

  return (
    <div id="cavecraft-app" className="w-screen h-screen bg-[#060608] overflow-hidden relative select-none font-sans text-[#e2e8f0]">
      {/* BACKGROUND DECORATIVE GRID */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#11111a] via-[#07070a] to-black z-0 pointer-events-none" />
      {/* Interactive Floating Neon Ores behind Main Menu */}
      <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-[20%] right-[15%] w-72 h-72 rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0 animate-pulse" />

      {/* STARTUP MAIN MENU SCREEN */}
      {screen === 'menu' && (
        <div id="main-menu-container" className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            {/* Title banner */}
            <div className="md:col-span-12 text-center pb-4 border-b border-white/5 relative z-10">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/30 border border-cyan-500/20 rounded-full text-xs font-semibold text-cyan-400 mb-3"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>3D WebGL Voxel 沙盒遊戲</span>
              </motion.div>
              
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-500 bg-clip-text text-transparent filter drop-shadow-md">
                CAVECRAFT
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-1.5 font-medium leading-relaxed max-w-lg mx-auto">
                自由建造、隨心塑形、深掘地表以發掘鑽石，探索有機扭曲的地底巨大洞穴世界！
              </p>
            </div>

            {/* Left side: World Save Selection list */}
            <div className="md:col-span-7 flex flex-col gap-4 relative z-10">
              <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>選擇遊玩世界</span>
              </h2>

              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-2.5 pr-2">
                {worlds.map(world => {
                  const blockCount = Object.keys(world.blocks).length;
                  return (
                    <div
                      key={world.id}
                      onClick={() => handleLoadWorld(world.id)}
                      className="w-full text-left p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-200 flex justify-between items-center group relative overflow-hidden shadow-inner cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {world.name}
                        </h3>
                        <div className="flex gap-3 text-[10px] text-zinc-400 font-mono mt-1">
                          <span>種子碼: <strong className="text-zinc-300">{world.seed}</strong></span>
                          <span>•</span>
                          <span>自訂方塊: <strong className="text-zinc-300">{blockCount}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 z-10">
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md font-bold group-hover:bg-cyan-400 group-hover:text-black transition-all">
                          探索世界
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`確定要刪除「${world.name}」世界嗎？此動作無法復原！`)) {
                              handleDeleteWorld(world.id);
                            }
                          }}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-500/20 text-red-300 rounded-lg hover:scale-105 transition-all cursor-pointer"
                          title="刪除世界"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: New World custom Seed creator */}
            <div className="md:col-span-5 flex flex-col justify-between bg-white/5 border border-white/10 p-5 rounded-xl relative z-10 min-h-[300px] shadow-lg">
              <div>
                <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>開拓嶄新紀元</span>
                </h2>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">世界名稱</label>
                    <input
                      type="text"
                      placeholder="我的冒險樂園"
                      value={menuWorldName}
                      onChange={e => setMenuWorldName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">地圖種子 Seed (留白則隨機)</label>
                    <input
                      type="text"
                      placeholder="e.g. 520, cave, blocks, forest"
                      value={menuSeed}
                      onChange={e => setMenuSeed(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
                    />
                  </div>

                  {/* Mode select */}
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono block mb-1">初始遊戲模式</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { playSound.click(settings.soundEnabled); setMenuMode('survival'); }}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          menuMode === 'survival'
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                            : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        🍖 生存模式
                      </button>
                      <button
                        type="button"
                        onClick={() => { playSound.click(settings.soundEnabled); setMenuMode('creative'); }}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          menuMode === 'creative'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                            : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        🎨 創造模式
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const seed = menuSeed.trim() || String(Math.floor(Math.random() * 9999999));
                  handleCreateNewWorld(menuWorldName, seed, menuMode);
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs py-3.5 px-4 rounded-xl mt-4 shadow-[0_0_18px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider font-sans cursor-pointer font-bold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>生成世界並進入冒險</span>
              </button>
            </div>
          </div>
          
          {/* Audio toggle under menu */}
          <div className="mt-4 flex items-center gap-2 bg-zinc-900/60 border border-white/5 px-4 py-2 rounded-full">
            <span className="text-xs text-zinc-400 font-medium">背景音效與提示聲</span>
            <button
              onClick={() => {
                const n = !settings.soundEnabled;
                setSettings(prev => ({ ...prev, soundEnabled: n }));
                playSound.click(n);
              }}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEWORLD SCREEN */}
      {screen === 'playing' && (
        <div id="game-active-screen" className="absolute inset-0 z-10 w-full h-full flex flex-col">
          {/* THREE.JS GL CANVAS ENGINE */}
          <GameCanvas
            playerStats={playerStats}
            settings={settings}
            worldBlocks={worldBlocks}
            seed={activeWorld?.seed || '0'}
            isPaused={gamePaused}
            isMobile={isMobile}
            mobileJoystick={mobileJoystick}
            mobileAction={mobileAction}
            onClearMobileAction={() => setMobileAction(null)}
            onUpdateStats={setPlayerStats}
            onUpdateBlocks={setWorldBlocks}
            onUpdateMiniMap={setMiniMapGrid}
            onUpdateSettings={setSettings}
          />

          {/* VIRTUAL JOYSTICK FOR MOBILE */}
          {isMobile && !gamePaused && (
            <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
              <Joystick
                onMove={handleJoystickMove}
                onEnd={handleJoystickEnd}
              />
            </div>
          )}

          {/* HUD OVERLAYS, HOTBARS, MENUS, MAP */}
          <UIOverlay
            playerStats={playerStats}
            settings={settings}
            activeWorlds={worlds}
            currentWorldId={currentWorldId}
            gamePaused={gamePaused}
            onSetSelectedBlock={(blockType) => setPlayerStats(prev => ({ ...prev, selectedBlock: blockType }))}
            onTogglePause={() => setGamePaused(prev => !prev)}
            onUpdateSettings={setSettings}
            onUpdateStats={setPlayerStats}
            onSaveWorld={(name) => saveWorldState(currentWorldId)}
            onLoadWorld={handleLoadWorld}
            onCreateNewWorld={handleCreateNewWorld}
            onDeleteWorld={handleDeleteWorld}
            onExportWorld={handleExportWorld}
            onImportWorld={handleImportWorld}
            onResetWorld={handleResetWorld}
            onTriggerAction={(action) => setMobileAction(action)}
            isMobile={isMobile}
            miniMapGrid={miniMapGrid}
          />

          {/* ESC TO UNPAUSE BANNER (ONLY ON DESKTOP AND WHILE PAUSED) */}
          {gamePaused && (
            <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden md:block">
              <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
                按下 <strong className="text-zinc-300">ESC 鍵</strong> 隨時返回冒險
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
