export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  GLASS = 6,
  COAL = 7,
  IRON = 8,
  GOLD = 9,
  DIAMOND = 10,
  REDSTONE = 11,
  OBSIDIAN = 12,
  TORCH = 13,
  PLANK = 14,
  COBBLESTONE = 15,
}

export interface BlockInfo {
  type: BlockType;
  name: string;
  color: string; // fallback color
  textColor?: string;
  emissiveColor?: string; // for glowing blocks like Redstone, Torch
  isSolid: boolean;
  isTransparent: boolean;
  opacity?: number;
  description: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  durability: number; // break time modifier
}

export const BLOCK_DETAILS: Record<BlockType, BlockInfo> = {
  [BlockType.AIR]: {
    type: BlockType.AIR,
    name: '空氣',
    color: '#000000',
    isSolid: false,
    isTransparent: true,
    description: '空無一物',
    rarity: 'Common',
    durability: 0,
  },
  [BlockType.GRASS]: {
    type: BlockType.GRASS,
    name: '草方塊',
    color: '#557a2b',
    isSolid: true,
    isTransparent: false,
    description: '覆蓋著綠草的泥土方塊，常出現在地表。',
    rarity: 'Common',
    durability: 0.5,
  },
  [BlockType.DIRT]: {
    type: BlockType.DIRT,
    name: '泥土',
    color: '#866043',
    isSolid: true,
    isTransparent: false,
    description: '普通的泥土方塊，肥沃且容易挖掘。',
    rarity: 'Common',
    durability: 0.4,
  },
  [BlockType.STONE]: {
    type: BlockType.STONE,
    name: '石頭',
    color: '#737373',
    isSolid: true,
    isTransparent: false,
    description: '堅硬的灰色石頭，構成世界的主要地殼。',
    rarity: 'Common',
    durability: 1.2,
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD,
    name: '原木',
    color: '#5c4033',
    isSolid: true,
    isTransparent: false,
    description: '樹木的軀幹，可以用來製作木板和建材。',
    rarity: 'Common',
    durability: 0.8,
  },
  [BlockType.LEAVES]: {
    type: BlockType.LEAVES,
    name: '樹葉',
    color: '#2e5c1e',
    isSolid: true,
    isTransparent: true,
    opacity: 0.85,
    description: '茂密的橡樹葉，有些微透明感。',
    rarity: 'Common',
    durability: 0.2,
  },
  [BlockType.GLASS]: {
    type: BlockType.GLASS,
    name: '玻璃',
    color: '#e0f2fe',
    isSolid: true,
    isTransparent: true,
    opacity: 0.4,
    description: '透光的玻璃方塊，適合做為窗戶，能看透內外。',
    rarity: 'Uncommon',
    durability: 0.3,
  },
  [BlockType.COAL]: {
    type: BlockType.COAL,
    name: '煤礦石',
    color: '#262626',
    isSolid: true,
    isTransparent: false,
    description: '夾雜著黑色煤炭的石頭，是製作火把的燃料。',
    rarity: 'Common',
    durability: 1.5,
  },
  [BlockType.IRON]: {
    type: BlockType.IRON,
    name: '鐵礦石',
    color: '#d4af37', // metallic brownish orange
    isSolid: true,
    isTransparent: false,
    description: '含有鐵質斑點的礦石，可用於熔煉金屬工具。',
    rarity: 'Uncommon',
    durability: 1.8,
  },
  [BlockType.GOLD]: {
    type: BlockType.GOLD,
    name: '金礦石',
    color: '#fbbf24', // golden yellow
    isSolid: true,
    isTransparent: false,
    description: '閃耀著金光的稀有礦石，常分佈於較深的地層。',
    rarity: 'Rare',
    durability: 2.2,
  },
  [BlockType.DIAMOND]: {
    type: BlockType.DIAMOND,
    name: '鑽石礦石',
    color: '#06b6d4', // cyan-blue glow
    emissiveColor: '#0891b2',
    isSolid: true,
    isTransparent: false,
    description: '極為罕見、閃爍著耀眼天藍色光芒的至寶礦石。',
    rarity: 'Legendary',
    durability: 3.0,
  },
  [BlockType.REDSTONE]: {
    type: BlockType.REDSTONE,
    name: '紅石礦石',
    color: '#ef4444', // bright red
    emissiveColor: '#dc2626',
    isSolid: true,
    isTransparent: false,
    description: '散發著微弱紅色能量的礦石，是傳導機關的原料。',
    rarity: 'Rare',
    durability: 1.6,
  },
  [BlockType.OBSIDIAN]: {
    type: BlockType.OBSIDIAN,
    name: '黑曜石',
    color: '#1e1b4b', // deep purple-black
    isSolid: true,
    isTransparent: false,
    description: '由水與岩漿結合而成的極度堅硬黑色火山岩，極難挖掘。',
    rarity: 'Legendary',
    durability: 5.0,
  },
  [BlockType.TORCH]: {
    type: BlockType.TORCH,
    name: '火把',
    color: '#f97316',
    emissiveColor: '#ea580c',
    isSolid: false,
    isTransparent: true,
    description: '提供光明的火把。在黑暗的地底洞穴探索不可或缺。',
    rarity: 'Uncommon',
    durability: 0.1,
  },
  [BlockType.PLANK]: {
    type: BlockType.PLANK,
    name: '橡木木板',
    color: '#b45309',
    isSolid: true,
    isTransparent: false,
    description: '加工過後的精緻木板，極佳的裝飾與建構材料。',
    rarity: 'Common',
    durability: 0.6,
  },
  [BlockType.COBBLESTONE]: {
    type: BlockType.COBBLESTONE,
    name: '鵝卵石',
    color: '#525252',
    isSolid: true,
    isTransparent: false,
    description: '開採石頭後獲得的碎石塊，是實用的基礎建材。',
    rarity: 'Common',
    durability: 1.0,
  },
};

export interface PlayerStats {
  health: number; // 0 - 100
  oxygen: number; // 0 - 100 (for underwater/dark cave gas survival, optional but cool!)
  mode: 'survival' | 'creative';
  inventory: Record<BlockType, number>; // items count in survival
  selectedBlock: BlockType;
  position: { x: number; y: number; z: number };
  isFlying: boolean;
}

export interface GameSettings {
  renderDistance: number; // chunks (e.g. 2, 3, 4, 5)
  showMinimap: boolean;
  dayNightCycle: boolean;
  cycleSpeed: number; // speed scale
  soundEnabled: boolean;
  gravityEnabled: boolean;
  superSpeed: boolean; // creative speed booster
  timeOfDay: number; // 0 - 24000 (0 = noon, 6000 = sunset, 12000 = midnight, 18000 = sunrise)
  fov: number; // 60 - 90
}

export interface WorldSave {
  id: string;
  name: string;
  seed: string;
  blocks: Record<string, number>; // sparse coord to block type: "x,y,z" -> type
  playerStats: Omit<PlayerStats, 'isFlying'>;
  settings: GameSettings;
  createdAt: number;
}
