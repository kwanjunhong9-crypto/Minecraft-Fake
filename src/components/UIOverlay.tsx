import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Eye,
  Settings,
  Briefcase,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  ArrowUp,
  ArrowDown,
  Hammer,
  Trash2,
  Share2,
  FileDown,
  FileUp,
  Info,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  Skull,
} from 'lucide-react';
import { BlockType, BLOCK_DETAILS, PlayerStats, GameSettings, WorldSave } from '../types';
import { playSound } from '../utils/audio';
import { BlockSprite } from './BlockSprite';

interface UIOverlayProps {
  playerStats: PlayerStats;
  settings: GameSettings;
  activeWorlds: WorldSave[];
  currentWorldId: string;
  gamePaused: boolean;
  onSetSelectedBlock: (type: BlockType) => void;
  onTogglePause: () => void;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onSaveWorld: (name: string) => void;
  onLoadWorld: (id: string) => void;
  onCreateNewWorld: (name: string, seed: string) => void;
  onDeleteWorld: (id: string) => void;
  onExportWorld: () => string;
  onImportWorld: (json: string) => boolean;
  onResetWorld: () => void;
  onTriggerAction: (action: 'break' | 'place' | 'jump' | 'sneak' | 'fly') => void;
  isMobile: boolean;
  miniMapGrid: number[][]; // 2D slice around player
}

export default function UIOverlay({
  playerStats,
  settings,
  activeWorlds,
  currentWorldId,
  gamePaused,
  onSetSelectedBlock,
  onTogglePause,
  onUpdateSettings,
  onUpdateStats,
  onSaveWorld,
  onLoadWorld,
  onCreateNewWorld,
  onDeleteWorld,
  onExportWorld,
  onImportWorld,
  onResetWorld,
  onTriggerAction,
  isMobile,
  miniMapGrid,
}: UIOverlayProps) {
  const [menuView, setMenuView] = useState<'main' | 'settings' | 'worlds' | 'help' | 'inventory'>('main');
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldSeed, setNewWorldSeed] = useState('');
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hideHUD, setHideHUD] = useState(false);

  useEffect(() => {
    const handleOpenInventory = () => {
      setMenuView('inventory');
    };
    window.addEventListener('open-inventory', handleOpenInventory);
    return () => window.removeEventListener('open-inventory', handleOpenInventory);
  }, []);

  useEffect(() => {
    if (gamePaused) {
      setMenuView('main');
    }
  }, [gamePaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.key === 'f1') {
        e.preventDefault();
        setHideHUD(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDead = playerStats.health <= 0 && playerStats.mode === 'survival';

  useEffect(() => {
    if (isDead) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [isDead]);

  const hotbarSlots: BlockType[] = [
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

  const handleSlotClick = (type: BlockType) => {
    playSound.click(settings.soundEnabled);
    onSetSelectedBlock(type);
  };

  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleSave = () => {
    const currentWorld = activeWorlds.find(w => w.id === currentWorldId);
    const name = currentWorld ? currentWorld.name : '我的世界';
    onSaveWorld(name);
    triggerNotification('遊戲存檔已成功儲存！');
  };

  const handleCreateWorldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;
    onCreateNewWorld(newWorldName.trim(), newWorldSeed.trim() || String(Math.floor(Math.random() * 999999)));
    setNewWorldName('');
    setNewWorldSeed('');
    triggerNotification('全新世界已生成！');
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const success = onImportWorld(importText.trim());
    if (success) {
      triggerNotification('地圖匯入成功！');
      setImportText('');
    } else {
      triggerNotification('匯入失敗，請檢查格式代碼。', 'error');
    }
  };

  const handleExport = () => {
    const data = onExportWorld();
    setExportText(data);
    navigator.clipboard.writeText(data).then(
      () => triggerNotification('存檔代碼已複製到剪貼簿！'),
      () => triggerNotification('生成代碼成功，請手動複製。')
    );
  };

  const splashTexts = [
    "自由建造，發掘奧秘！",
    "8-Bit 像素懷舊風格！",
    "無限地底迴廊！",
    "探索、挖掘、生存！",
    "F1 可以隱藏整個 HUD 喔！",
    "有火把就不怕黑了！",
    "不要掉進虛空！",
    "鑽石礦就在地底深處！",
    "WebGL 方塊沙盒世界！",
    "創造無限可能！"
  ];

  const [splashText, setSplashText] = useState(() => splashTexts[Math.floor(Math.random() * splashTexts.length)]);

  useEffect(() => {
    if (gamePaused) {
      setSplashText(splashTexts[Math.floor(Math.random() * splashTexts.length)]);
    }
  }, [gamePaused]);

  const tips = [
    "💡 提示: 往地下深處挖掘可以找到稀有的鑽石礦！",
    "💡 提示: 在石壁上放置火把，可以點亮漆黑的洞穴！",
    "💡 提示: 連按兩次空白鍵或按下 F 鍵即可啟動飛行模式！",
    "💡 提示: 在生存模式下，高處墜落會受到傷害，注意安全！",
    "💡 提示: 點擊背包中的方塊即可切換手持方塊種類！",
    "💡 提示: 掉落進虛空會持續受到虛空傷害，請儘快往上飛！",
    "💡 提示: 創造模式下點選圖鑑方塊，能直接加入熱鍵欄！"
  ];

  const showRandomTip = () => {
    playSound.click(settings.soundEnabled);
    const rand = tips[Math.floor(Math.random() * tips.length)];
    triggerNotification(rand, 'success');
  };

  const handleSaveAndQuit = () => {
    playSound.click(settings.soundEnabled);
    onSaveWorld('AutoSave');
    triggerNotification('💾 存檔成功！已自動保存冒險數據！', 'success');
    setTimeout(() => {
      onTogglePause();
    }, 600);
  };

  // Convert game ticks to friendly 24h clock: 0=12:00, 6000=18:00, 12000=00:00, 18000=06:00
  const getFriendlyTime = (ticks: number) => {
    const adjusted = (ticks + 12000) % 24000;
    const hours = Math.floor(adjusted / 1000);
    const minutes = Math.floor((adjusted % 1000) / 1000 * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const materialsCount = Object.values(playerStats.inventory).reduce((acc, curr) => acc + (curr || 0), 0);
  const currentDepthLevel = Math.floor(playerStats.position.y);
  const activeBlockInfo = BLOCK_DETAILS[playerStats.selectedBlock];

  return (
    <div id="ui-overlay-root" className="absolute inset-0 z-10 flex flex-col pointer-events-none select-none text-white font-sans">
      
      {/* TOP STATUS BAR */}
      <div id="hud-top-bar" className="w-full p-6 flex justify-between items-start pointer-events-auto z-20">
        {/* Left Side: Empty since we removed Server Active & XYZ Stats */}
        <div />

        {/* Right Side: Empty since we removed Quick Save and Controls buttons */}
        <div />
      </div>

      {/* PAUSE / SETTINGS / WORLDS MENU MODAL */}
      <AnimatePresence>
        {gamePaused && (
          <div id="game-menu-modal" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
            {menuView === 'main' ? (
              // Bedrock Pause Menu Layout
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex flex-col items-center gap-1.5 w-full max-w-[420px]"
              >
                {/* Minecraft Title Container */}
                <div className="relative mb-6 select-none">
                  <h1 className="text-white text-5xl md:text-6xl font-extrabold tracking-widest text-center select-none font-pixel uppercase filter drop-shadow-[0_5px_0_rgba(0,0,0,0.6)]"
                      style={{
                        textShadow: `
                          -3px -3px 0 #000,  
                           3px -3px 0 #000,
                          -3px  3px 0 #000,
                           3px  3px 0 #000,
                           0px  5px 0 #555,
                           0px  7px 0 #000
                        `
                      }}>
                    MINECRAFT
                  </h1>
                  {/* Floating yellow splash text */}
                  <div className="absolute top-[-10px] right-[-45px] rotate-[-12deg] text-yellow-300 text-[10px] md:text-xs font-bold animate-pulse select-none font-pixel drop-shadow-[2px_2px_0_#000] whitespace-nowrap">
                    {splashText}
                  </div>
                </div>

                {/* Vertical Stack of 4 Minecraft Styled Buttons */}
                <div className="flex flex-col gap-3.5 w-full">
                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      onTogglePause();
                    }}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold text-base md:text-lg py-3.5 px-6 shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer text-center tracking-wider transition-all duration-75 select-none active:scale-95"
                  >
                    继续游戏
                  </button>

                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      setMenuView('settings');
                    }}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold text-base md:text-lg py-3.5 px-6 shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer text-center tracking-wider transition-all duration-75 select-none active:scale-95"
                  >
                    设置
                  </button>

                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      setMenuView('worlds');
                    }}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold text-base md:text-lg py-3.5 px-6 shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer text-center tracking-wider transition-all duration-75 select-none active:scale-95"
                  >
                    浏览附加内容！
                  </button>

                  <button
                    onClick={handleSaveAndQuit}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold text-base md:text-lg py-3.5 px-6 shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer text-center tracking-wider transition-all duration-75 select-none active:scale-95"
                  >
                    保存并退出
                  </button>
                </div>

                {/* Horizontal row of 3 square buttons */}
                <div className="flex gap-4 mt-6">
                  {/* Help */}
                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      setMenuView('help');
                    }}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold w-14 h-14 flex items-center justify-center shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer transition-all duration-75 select-none active:scale-95"
                    title="操作說明與提示"
                  >
                    <Info className="w-6 h-6 text-zinc-700" />
                  </button>

                  {/* Tips Question mark */}
                  <button
                    onClick={showRandomTip}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-700 font-extrabold text-2xl w-14 h-14 flex items-center justify-center shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer transition-all duration-75 select-none font-vt active:scale-95"
                    title="隨機探險秘訣"
                  >
                    ?
                  </button>

                  {/* Camera Screen Shot HUD toggle */}
                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      setHideHUD(prev => !prev);
                      triggerNotification(hideHUD ? '📷 已恢復抬頭顯示器 (HUD)' : '📷 抬頭顯示器 (HUD) 已隱藏！按 F1 或下方按鈕可恢復', 'success');
                    }}
                    className="border-[3px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold w-14 h-14 flex items-center justify-center shadow-[inset_3px_3px_0px_#ffffff,inset_-3px_-3px_0px_#8a8a8a] rounded-[4px] cursor-pointer transition-all duration-75 select-none active:scale-95"
                    title="隱藏/顯示 HUD 介面 (F1)"
                  >
                    <Settings className="w-6 h-6 text-zinc-700" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // Minecraft Styled Sub-Panel Frame for settings, worlds, help, inventory
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#2e2e2e] border-[4px] border-[#1a1a1a] w-full max-w-4xl rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col h-[85vh] select-none pointer-events-auto"
              >
                {/* Header */}
                <div className="bg-[#151515] p-4 border-b-[3px] border-[#3c3c3c] flex justify-between items-center">
                  <span className="text-white text-xl md:text-2xl font-bold font-vt uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-yellow-400 rounded-sm inline-block animate-pulse" />
                    {menuView === 'settings' && '遊戲細部設定 (SETTINGS)'}
                    {menuView === 'worlds' && '世界存檔與附加內容 (WORLDS)'}
                    {menuView === 'help' && '控制說明與提示 (HOW TO PLAY)'}
                    {menuView === 'inventory' && '創造方塊庫與圖鑑 (INVENTORY)'}
                  </span>
                  
                  <button
                    onClick={() => {
                      playSound.click(settings.soundEnabled);
                      setMenuView('main');
                    }}
                    className="border-[2px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 active:bg-zinc-400 text-zinc-800 font-extrabold text-xs md:text-sm py-2 px-4 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] rounded-[3px] cursor-pointer transition-all active:scale-95"
                  >
                    返回主選單 (BACK)
                  </button>
                </div>

                {/* Tab contents */}
                <div className="flex-1 p-6 overflow-y-auto bg-[#2b2b2b]">
                  {/* TAB 1: HELP */}
                  {menuView === 'help' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-white mb-1">🎮 操作指南</h3>
                        <p className="text-xs text-zinc-400">我們為電腦與行動裝置設計了最契合的操作模式</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Keyboard Controls */}
                        <div className="bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 shadow-inner">
                          <h4 className="text-xs font-bold text-yellow-400 mb-2.5 flex items-center gap-2">
                            <span>💻 電腦鍵盤/滑鼠</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-zinc-300 font-mono">
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">移動</span> <span>WASD</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">視角旋轉</span> <span>移動滑鼠 (點畫面上鎖)</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">跳躍 / 飛行爬升</span> <span>空白鍵 (Space)</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">下蹲 / 飛行下降</span> <span>左 Shift 鍵</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">開採方塊 (破壞)</span> <span>滑鼠左鍵</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">建造方塊 (放置)</span> <span>滑鼠右鍵</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">選擇熱鍵欄</span> <span>數字鍵 1 - 9 / 滾輪</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">切換飛行模式</span> <span>連續按兩下空白 或 鍵盤 F</span></li>
                            <li className="flex justify-between"><span className="text-zinc-500">開/關此選單</span> <span>ESC 鍵</span></li>
                          </ul>
                        </div>

                        {/* Interactive tips */}
                        <div className="bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 flex flex-col justify-between shadow-inner">
                          <div>
                            <h4 className="text-xs font-bold text-yellow-400 mb-2.5 flex items-center gap-2">
                              <span>🧗‍♀️ 地底探險與光源</span>
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              往下挖掘即可進入地底深處！隨著高度降低，世界會逐漸變暗並開啟低沉的環境音效。
                            </p>
                            <p className="text-xs text-zinc-300 leading-relaxed mt-2 font-medium text-yellow-300">
                              💡 秘訣：使用熱鍵欄選擇「火把」，在地底石壁上放置它，能瞬間點亮四周，引導探險！
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                              地底分佈著五大稀有礦石（煤、鐵、金、紅石、鑽石）。在生存模式下，開採它們會使你的物品欄數量增加。
                            </p>
                          </div>

                          <div className="bg-yellow-950/40 border border-yellow-700/30 rounded p-2.5 mt-3 text-xs text-yellow-300">
                            <strong>💡 提示:</strong> 如果您的滑鼠無法旋轉，請按一下遊戲畫面。這將啟動 Pointer Lock 機制，讓操控更順暢。
                          </div>
                        </div>
                      </div>

                      {/* Mode selection quick-toggle */}
                      <div className="bg-[#1e1e1e] border-2 border-[#121212] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                        <div>
                          <h4 className="text-xs font-bold text-white mb-0.5">🚀 遊戲模式切換</h4>
                          <p className="text-xs text-zinc-400">目前處於: <strong className="text-yellow-400">{playerStats.mode === 'creative' ? '創造模式 (無限方塊、可自由飛行)' : '生存模式 (生命值、收集方塊)'}</strong></p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onUpdateStats(prev => ({ ...prev, mode: 'creative', isFlying: true }));
                              triggerNotification('已切換為：創造模式！');
                            }}
                            className={`px-4 py-2 border-2 border-zinc-900 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] rounded-[3px] text-xs font-bold transition-all ${
                              playerStats.mode === 'creative' ? 'bg-yellow-500 text-black' : 'bg-zinc-300 text-zinc-850 hover:bg-zinc-200'
                            }`}
                          >
                            🎨 創造模式
                          </button>
                          <button
                            onClick={() => {
                              onUpdateStats(prev => ({ ...prev, mode: 'survival', isFlying: false }));
                              triggerNotification('已切換為：生存模式！');
                            }}
                            className={`px-4 py-2 border-2 border-zinc-900 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] rounded-[3px] text-xs font-bold transition-all ${
                              playerStats.mode === 'survival' ? 'bg-yellow-500 text-black' : 'bg-zinc-300 text-zinc-850 hover:bg-zinc-200'
                            }`}
                          >
                            🍖 生存模式
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: INVENTORY / BLOCK DICTIONARY */}
                  {menuView === 'inventory' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-white mb-1">
                          {playerStats.mode === 'survival' ? '🎒 我的生存背包 (開採收集)' : '📦 創造模式方塊庫 (無限方塊)'}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {playerStats.mode === 'survival' 
                            ? '查閱目前背包擁有的資源。點擊你收集到的方塊將其裝備到手持狀態。' 
                            : '點擊下方任何方塊將其放入你的熱鍵選擇欄。同時可以查閱該方塊的硬度與特性。'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.values(BLOCK_DETAILS)
                          .filter(b => b.type !== BlockType.AIR)
                          .map(block => {
                            const isSelected = playerStats.selectedBlock === block.type;
                            const count = playerStats.inventory[block.type] || 0;
                            const isSurvival = playerStats.mode === 'survival';
                            const hasItem = !isSurvival || count > 0;

                            return (
                              <button
                                key={block.type}
                                onClick={() => {
                                  if (!hasItem) {
                                    triggerNotification(`⚠️ 你目前背包裡沒有【${block.name}】，請先去世界裡挖掘開採！`, 'error');
                                    return;
                                  }
                                  handleSlotClick(block.type);
                                  triggerNotification(`已手持：${block.name}！`);
                                }}
                                className={`text-left p-3 rounded-lg border-2 flex gap-3 transition-all ${
                                  isSelected
                                    ? 'bg-yellow-950/20 border-yellow-500 shadow-inner'
                                    : hasItem
                                      ? 'bg-[#1e1e1e] border-[#121212] hover:border-zinc-500'
                                      : 'bg-zinc-950/10 border-white/5 opacity-45 cursor-not-allowed'
                                }`}
                              >
                                {/* Pseudo 3D Block Visual */}
                                <div className={!hasItem ? 'opacity-30 saturate-50' : ''}>
                                  <BlockSprite type={block.type} size="md" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs truncate">{block.name}</span>
                                    {isSurvival ? (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold font-mono ${
                                        count > 0 ? 'bg-yellow-950 text-yellow-400 border border-yellow-700/30' : 'bg-red-950/50 text-red-400'
                                      }`}>
                                        {count > 0 ? `×${count}` : '未擁有'}
                                      </span>
                                    ) : (
                                      <span className={`text-[8px] px-1 py-0.5 rounded-sm leading-none font-bold ${
                                        block.rarity === 'Legendary' ? 'bg-purple-900 text-purple-300' :
                                        block.rarity === 'Rare' ? 'bg-cyan-950 text-cyan-300' :
                                        block.rarity === 'Uncommon' ? 'bg-zinc-800 text-amber-300' :
                                        'bg-zinc-800 text-zinc-400'
                                      }`}>
                                        {block.rarity}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{block.description}</p>
                                  <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-500 font-mono">
                                    <span>挖掘阻力: {block.durability}s</span>
                                    <span>•</span>
                                    <span>{block.isSolid ? '固體' : '非固體'}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: SETTINGS */}
                  {menuView === 'settings' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div>
                        <h3 className="text-base font-bold text-white mb-1">⚙️ 遊戲細部設定</h3>
                        <p className="text-xs text-zinc-400">優化渲染效能、物理屬性與探索難度</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Render & Graphics Settings */}
                        <div className="space-y-4 bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 shadow-inner">
                          <h4 className="text-xs font-bold text-yellow-400 border-b border-white/5 pb-1.5">🖥️ 視覺與效能</h4>
                          
                          {/* Render Distance */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400 font-bold">渲染視野 (Render Distance)</span>
                              <span className="text-yellow-400 font-bold">{settings.renderDistance} 區塊 (Chunks)</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="4"
                              value={settings.renderDistance}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                onUpdateSettings(prev => ({ ...prev, renderDistance: val }));
                              }}
                              className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                            />
                            <p className="text-[10px] text-zinc-500">
                              提示：在效能受限的裝置或嵌入式視窗中，較低的區塊值（如 2）能提供極高的幀率。
                            </p>
                          </div>

                          {/* Minimap Toggle */}
                          <div className="flex justify-between items-center py-1">
                            <div>
                              <span className="text-xs text-zinc-300 block">顯示地底洞穴雷達</span>
                              <span className="text-[10px] text-zinc-500">在右上角顯示 2D 即時探測圖</span>
                            </div>
                            <button
                              onClick={() => onUpdateSettings(prev => ({ ...prev, showMinimap: !prev.showMinimap }))}
                              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                                settings.showMinimap ? 'bg-yellow-500' : 'bg-zinc-800'
                              }`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.showMinimap ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {/* DayNight Cycle Toggle */}
                          <div className="flex justify-between items-center py-1">
                            <div>
                              <span className="text-xs text-zinc-300 block">啟動日夜交替 (Day/Night)</span>
                              <span className="text-[10px] text-zinc-500">天空顏色與太陽高度會動態推移</span>
                            </div>
                            <button
                              onClick={() => onUpdateSettings(prev => ({ ...prev, dayNightCycle: !prev.dayNightCycle }))}
                              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                                settings.dayNightCycle ? 'bg-yellow-500' : 'bg-zinc-800'
                              }`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.dayNightCycle ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>

                        {/* Physical & Audios Settings */}
                        <div className="space-y-4 bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 shadow-inner">
                          <h4 className="text-xs font-bold text-yellow-400 border-b border-white/5 pb-1.5">🎵 物理與聲音</h4>

                          {/* Audio Toggle */}
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs text-zinc-300 block">音訊效果 (Web Audio API)</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                播放 8-bit 打包音效與洞穴深層低鳴
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const newSound = !settings.soundEnabled;
                                onUpdateSettings(prev => ({ ...prev, soundEnabled: newSound }));
                                if (!newSound) {
                                  // Stop ambiance immediately
                                  try {
                                    const audio = require('../utils/audio');
                                    audio.playSound.stopCaveAmbiance();
                                  } catch(e){}
                                }
                              }}
                              className="p-2 border-2 border-zinc-900 bg-zinc-300 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] text-zinc-850 hover:bg-zinc-200 transition-colors"
                            >
                              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                            </button>
                          </div>

                          {/* Gravity */}
                          <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                            <div>
                              <span className="text-xs text-zinc-300 block">啟動重力感應 (Gravity)</span>
                              <span className="text-[10px] text-zinc-500">非飛行狀態下玩家會受重力下墜</span>
                            </div>
                            <button
                              onClick={() => onUpdateSettings(prev => ({ ...prev, gravityEnabled: !prev.gravityEnabled }))}
                              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                                settings.gravityEnabled ? 'bg-yellow-500' : 'bg-zinc-800'
                              }`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.gravityEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {/* Speed Boost */}
                          <div className="flex justify-between items-center py-1">
                            <div>
                              <span className="text-xs text-zinc-300 block">疾跑加速 (Sprint Speed)</span>
                              <span className="text-[10px] text-zinc-500">使人物在世界中移動更加迅捷</span>
                            </div>
                            <button
                              onClick={() => onUpdateSettings(prev => ({ ...prev, superSpeed: !prev.superSpeed }))}
                              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                                settings.superSpeed ? 'bg-yellow-500' : 'bg-zinc-800'
                              }`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.superSpeed ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {/* World Reset */}
                          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                            <div>
                              <span className="text-xs text-zinc-300 block">重設當前世界</span>
                              <span className="text-[10px] text-red-400/85">移除所有已擺放的自定義方塊</span>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('確定要清除這個世界的所有手動修改並恢復原始地形嗎？此動作無法復原！')) {
                                  onResetWorld();
                                  triggerNotification('世界已被重設！');
                                  onTogglePause();
                                }
                              }}
                              className="px-3.5 py-1.5 border-[2px] border-zinc-900 bg-red-650 text-white font-bold text-xs rounded shadow-[inset_2px_2px_0px_#ff8888,inset_-2px_-2px_0px_#440000] cursor-pointer hover:bg-red-550 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>重設</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: WORLDS / BACKUP */}
                  {menuView === 'worlds' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1">🌍 世界存檔管理中心</h3>
                          <p className="text-xs text-zinc-400">創立新種子、載入其他存檔，或與好友分享您的世界</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Existing Worlds List */}
                        <div className="md:col-span-7 bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 flex flex-col h-[400px] shadow-inner">
                          <span className="text-xs font-bold text-yellow-400 mb-2 block">已儲存的世界</span>
                          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {activeWorlds.map(world => {
                              const isCurrent = world.id === currentWorldId;
                              const blockCount = Object.keys(world.blocks).length;
                              return (
                                <div
                                  key={world.id}
                                  className={`p-3 rounded border flex justify-between items-center transition-all ${
                                    isCurrent ? 'bg-yellow-950/20 border-yellow-500' : 'bg-zinc-900/60 border-zinc-850'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs text-white">{world.name}</span>
                                      {isCurrent && <span className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-sm font-bold font-mono">目前遊玩</span>}
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-zinc-400 font-mono mt-1">
                                      <span>種子碼: {world.seed}</span>
                                      <span>•</span>
                                      <span>已修改: {blockCount} 方塊</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-1.5">
                                    {!isCurrent && (
                                      <button
                                        onClick={() => {
                                          onLoadWorld(world.id);
                                          triggerNotification(`已載入：${world.name}`);
                                          onTogglePause();
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-bold border-[2px] border-zinc-900 bg-zinc-300 text-zinc-800 rounded shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] hover:bg-zinc-200"
                                        title="載入世界"
                                      >
                                        載入
                                      </button>
                                    )}
                                    {activeWorlds.length > 1 && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`確定要刪除「${world.name}」這個世界嗎？存檔資料將永久遺失！`)) {
                                            onDeleteWorld(world.id);
                                            triggerNotification('存檔已刪除！');
                                          }
                                        }}
                                        className="p-1.5 border-[2px] border-zinc-900 bg-red-650 hover:bg-red-550 text-white rounded shadow-[inset_1px_1px_0px_#ff8888,inset_-1px_-1px_0px_#440000]"
                                        title="刪除世界"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Create & Import/Export */}
                        <div className="md:col-span-5 flex flex-col gap-4">
                          {/* Create World Form */}
                          <form onSubmit={handleCreateWorldSubmit} className="bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 shadow-inner">
                            <span className="text-xs font-bold text-yellow-400 mb-2.5 block">🆕 開闢全新世界</span>
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-zinc-400 font-mono block mb-1">世界名稱</label>
                                <input
                                  type="text"
                                  placeholder="例如: 我的探險洞穴"
                                  value={newWorldName}
                                  onChange={e => setNewWorldName(e.target.value)}
                                  className="w-full bg-[#2c2c2c] border-2 border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400 font-mono block mb-1">地圖種子 Seed (空白則隨機)</label>
                                <input
                                  type="text"
                                  placeholder="例如: 88888, forest, cave"
                                  value={newWorldSeed}
                                  onChange={e => setNewWorldSeed(e.target.value)}
                                  className="w-full bg-[#2c2c2c] border-2 border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full border-[2px] border-zinc-900 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs py-2 px-4 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a] rounded-[3px] cursor-pointer transition-all active:scale-95"
                              >
                                生成並加載全新地圖
                              </button>
                            </div>
                          </form>

                          {/* Share Codes */}
                          <div className="bg-[#1e1e1e] border-2 border-[#121212] rounded-lg p-4 flex-1 flex flex-col justify-between min-h-[190px] shadow-inner">
                            <div>
                              <span className="text-xs font-bold text-yellow-400 mb-1 block">📤 備份與分享 (JSON)</span>
                              <p className="text-[10px] text-zinc-400 leading-tight">可以把整個存檔世界導出成文字代碼，儲存到電腦或發送給朋友！</p>
                            </div>

                            <div className="flex gap-2 my-2">
                              <button
                                onClick={handleExport}
                                className="w-full border-[2px] border-zinc-900 bg-zinc-300 hover:bg-zinc-200 text-zinc-800 font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1.5 shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#8a8a8a]"
                              >
                                <Share2 className="w-3.5 h-3.5 text-yellow-600" />
                                <span>複製/導出代碼</span>
                              </button>
                            </div>

                            <div>
                              <input
                                type="text"
                                placeholder="在此貼上導出的存檔 JSON 程式碼"
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                className="w-full bg-[#2c2c2c] border-2 border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-yellow-500 font-mono mb-1.5"
                              />
                              <button
                                onClick={handleImport}
                                className="w-full border-[2px] border-zinc-900 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-[11px] py-1 text-black rounded shadow-[inset_1.5px_1.5px_0px_#ffffff,inset_-1.5px_-1.5px_0px_#8a8a8a]"
                              >
                                📥 載入外部代碼
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border flex items-center gap-2 pointer-events-auto ${
              notification.type === 'error'
                ? 'bg-red-950 border-red-500/30 text-red-200'
                : 'bg-emerald-950 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-ping`} />
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM HUD - HOTBAR & HEAL THS (ONLY SHOWN WHEN MENU IS CLOSED) */}
      {/* Dynamic Interaction Prompt (Immersive UI design) */}
      {!gamePaused && !hideHUD && (
        <div
          id="hud-interaction-banner"
          className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 px-6 py-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)] pointer-events-none transition-all duration-300 z-20"
          style={{ display: 'none' }}
        >
          <span className="w-6 h-6 flex items-center justify-center border border-white rounded font-bold text-xs bg-black/40 text-white font-mono shadow-inner">E</span>
          <span id="hud-interaction-text" className="text-xs uppercase tracking-widest text-cyan-300 font-bold font-mono">
            Harvest Diamond Ore
          </span>
        </div>
      )}

      {/* BOTTOM HUD - HOTBAR & HEAL THS (ONLY SHOWN WHEN MENU IS CLOSED) */}
      {!gamePaused && !hideHUD && (
        <div id="hud-bottom-bar" className="mt-auto w-full flex flex-col items-center gap-3.5 p-6 pointer-events-auto z-20">
          
          {/* Health & Hunger / Oxygen Bars (Immersive Style) */}
          <div className="flex justify-between w-full max-w-[500px] px-2 mb-1">
            {/* Hearts (Health) */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, idx) => {
                const filled = playerStats.health >= (idx + 1) * 20;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-sm transition-all duration-300 ${
                      filled 
                        ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' 
                        : 'bg-black/40 border border-white/20'
                    }`}
                    title={`HP: ${playerStats.health}%`}
                  />
                );
              })}
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest ml-1 font-bold">Health</span>
            </div>

            {/* Oxygen / Hunger */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, idx) => {
                const filled = playerStats.oxygen >= (idx + 1) * 20;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-sm transition-all duration-300 ${
                      filled 
                        ? 'bg-orange-600 shadow-[0_0_8px_#ea580c]' 
                        : 'bg-black/40 border border-white/20'
                    }`}
                    title={`Oxygen: ${playerStats.oxygen}%`}
                  />
                );
              })}
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest ml-1 font-bold">Oxygen</span>
            </div>
          </div>

          {/* Immersive Hotbar Slots with Glass Style */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-2 rounded-xl flex gap-2 shadow-2xl">
            {hotbarSlots.map((type, index) => {
              const details = BLOCK_DETAILS[type];
              const isSelected = playerStats.selectedBlock === type;
              const count = playerStats.inventory[type] || 0;
              const isSurvival = playerStats.mode === 'survival';
              const isEmpty = isSurvival && count === 0;

              return (
                <button
                  key={index}
                  onClick={() => handleSlotClick(type)}
                  className={`w-14 h-14 rounded-lg flex items-center justify-center relative transition-all duration-200 border outline-none ${
                    isSelected
                      ? 'bg-white/10 border-2 border-cyan-400 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.35)] z-10'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  } ${isEmpty ? 'bg-black/40 border-dashed border-white/5' : ''}`}
                  title={`${details.name} (鍵盤數字鍵 ${index + 1})`}
                >
                  {/* Pseudo-3D Voxel representation */}
                  <div className={isEmpty ? 'opacity-25 scale-75 blur-[0.5px] transition-all' : 'transition-all'}>
                    <BlockSprite type={type} size="md" />
                  </div>

                  {/* Slot Number Label */}
                  <span className="absolute bottom-0.5 right-1.5 text-[9px] font-bold text-white opacity-65 font-mono">
                    {index + 1}
                  </span>

                  {/* Block Count in Survival */}
                  {isSurvival && (
                    <span className={`absolute top-1 left-1 text-[9px] font-bold font-mono bg-black/70 px-1 rounded-[3px] border border-white/5 ${
                      count > 0 ? 'text-cyan-300' : 'text-rose-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active selection tag overlay (centered) */}
          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 shadow-md">
            <span>現持:</span>
            <BlockSprite type={playerStats.selectedBlock} size="sm" />
            <strong className="text-white font-bold">{activeBlockInfo?.name}</strong>
            <span className="text-zinc-600">|</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
              {playerStats.mode === 'creative' ? 'Creative Mode' : 'Survival Mode'}
            </span>
          </div>

        </div>
      )}

      {/* MOBILE CONTROL BUTTONS (ONLY SHOWN ON MOBILE IN GAME) */}
      {!gamePaused && !hideHUD && isMobile && (
        <div id="mobile-control-buttons" className="absolute bottom-4 right-4 flex flex-col gap-2.5 items-end pointer-events-auto">
          {/* Action Buttons: Break & Build */}
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); onTriggerAction('break'); }}
              onClick={() => !('ontouchstart' in window) && onTriggerAction('break')}
              className="w-14 h-14 rounded-full bg-red-600/80 active:bg-red-500/90 text-white font-bold border border-red-500/20 shadow-lg flex flex-col items-center justify-center text-[10px]"
            >
              <Trash2 className="w-5 h-5 mb-0.5" />
              破壞
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); onTriggerAction('place'); }}
              onClick={() => !('ontouchstart' in window) && onTriggerAction('place')}
              className="w-14 h-14 rounded-full bg-emerald-600/80 active:bg-emerald-500/90 text-white font-bold border border-emerald-500/20 shadow-lg flex flex-col items-center justify-center text-[10px]"
            >
              <Hammer className="w-5 h-5 mb-0.5" />
              放置
            </button>
          </div>

          {/* Jump / Sneak / Fly Toggles */}
          <div className="flex gap-2">
            {/* Sneak / Fly Down */}
            <button
              onTouchStart={(e) => { e.preventDefault(); onTriggerAction('sneak'); }}
              onClick={() => !('ontouchstart' in window) && onTriggerAction('sneak')}
              className="w-12 h-12 rounded-xl bg-zinc-800/80 active:bg-zinc-700/95 text-zinc-300 border border-white/10 shadow-lg flex items-center justify-center"
              title="下蹲 / 飛行下降"
            >
              <ArrowDown className="w-5 h-5" />
            </button>

            {/* Fly Mode Switcher */}
            <button
              onTouchStart={(e) => { e.preventDefault(); onTriggerAction('fly'); }}
              onClick={() => !('ontouchstart' in window) && onTriggerAction('fly')}
              className={`w-12 h-12 rounded-xl border shadow-lg flex items-center justify-center text-[10px] font-bold ${
                playerStats.isFlying
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-zinc-800/80 text-zinc-400 border-white/10'
              }`}
              title="切換飛行模式"
            >
              <div className="flex flex-col items-center">
                <Zap className="w-4 h-4 mb-0.5" />
                <span>飛行</span>
              </div>
            </button>

            {/* Jump / Fly Up */}
            <button
              onTouchStart={(e) => { e.preventDefault(); onTriggerAction('jump'); }}
              onClick={() => !('ontouchstart' in window) && onTriggerAction('jump')}
              className="w-12 h-12 rounded-xl bg-cyan-600/80 active:bg-cyan-500/95 text-white border border-cyan-500/20 shadow-lg flex items-center justify-center"
              title="跳躍 / 飛行爬升"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {hideHUD && (
        <button
          onClick={() => {
            playSound.click(settings.soundEnabled);
            setHideHUD(false);
          }}
          className="fixed bottom-4 right-4 z-[100] bg-black/60 hover:bg-black/80 text-[10px] text-white/70 hover:text-white pointer-events-auto px-3 py-2 rounded-md font-mono border border-white/10 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-black/50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span>📷 HUD已隱藏 (按 F1 或點此恢復)</span>
        </button>
      )}

      {/* DEATH OVERLAY WITH RESPAWN BUTTON */}
      <AnimatePresence>
        {isDead && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center max-w-md w-full bg-red-950/20 border border-red-500/20 p-8 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 animate-pulse">
                <Skull className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="text-3xl font-black tracking-widest text-red-500 mb-2 filter drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
                你死亡了！
              </h2>
              
              <p className="text-zinc-400 text-xs leading-relaxed mb-8 max-w-xs">
                所有的心都扣完了。在地底世界的冒險中，生命值已經歸零。別氣餒，重生後你可以再次繼續你的旅程！
              </p>

              <button
                onClick={() => {
                  playSound.click(settings.soundEnabled);
                  onUpdateStats(prev => ({
                    ...prev,
                    health: 100,
                    oxygen: 100,
                    position: { x: 0, y: 15, z: 0 },
                  }));
                  window.dispatchEvent(new CustomEvent('game-respawn', { detail: { x: 0, y: 15, z: 0 } }));
                  triggerNotification('🌟 復活成功！生命值已完全恢復！', 'success');
                }}
                className="w-full bg-red-500 hover:bg-red-400 text-black font-extrabold text-sm py-3.5 px-6 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>立即重生 / 復活</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
