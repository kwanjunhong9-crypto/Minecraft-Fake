import { BlockType } from '../types';

// Deterministic pseudo-random number generator for pixel art textures
const pseudoRandom = (x: number, y: number) => {
  const sinVal = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return sinVal - Math.floor(sinVal);
};

// Procedural texture drawing functions
const drawDirt = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x, y);
      let color = '#866043'; // Base brown
      if (r < 0.15) {
        color = '#573d26'; // Dark brown
      } else if (r < 0.3) {
        color = '#a17450'; // Light brown
      } else if (r < 0.4) {
        color = '#3f2b1b'; // Dark shadow brown
      } else if (r < 0.45) {
        color = '#99816d'; // Gray pebble
      } else if (r < 0.5) {
        color = '#615243'; // Dark pebble
      } else if (r < 0.75) {
        color = '#7a553a'; // Medium dark brown
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawGrassTop = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x + 10, y + 20);
      let color = '#5c8630'; // Base green
      if (r < 0.25) {
        color = '#4c6e28'; // Dark green
      } else if (r < 0.55) {
        color = '#6ca138'; // Rich grass green
      } else if (r < 0.8) {
        color = '#7cb83c'; // Light green
      } else if (r < 0.9) {
        color = '#3b541e'; // Extra dark green shadows
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawGrassSide = (ctx: CanvasRenderingContext2D) => {
  const grassHeights = [4, 4, 5, 3, 4, 6, 5, 4, 3, 5, 4, 3, 4, 5, 4, 3];
  for (let x = 0; x < 16; x++) {
    const grassHeight = grassHeights[x];
    for (let y = 0; y < 16; y++) {
      if (y < grassHeight) {
        const isBorder = (y === grassHeight - 1);
        if (isBorder) {
          ctx.fillStyle = '#4c6e28'; // Dark border/shadow
        } else {
          const r = pseudoRandom(x + 50, y + 60);
          let color = '#5c8630';
          if (r < 0.25) {
            color = '#6ca138';
          } else if (r < 0.5) {
            color = '#7cb83c';
          }
          ctx.fillStyle = color;
        }
      } else {
        const r = pseudoRandom(x, y);
        let color = '#866043';
        if (r < 0.15) {
          color = '#573d26';
        } else if (r < 0.3) {
          color = '#a17450';
        } else if (r < 0.4) {
          color = '#3f2b1b';
        } {
          if (r < 0.45) {
            color = '#99816d';
          } else if (r < 0.5) {
            color = '#615243';
          } else if (r < 0.75) {
            color = '#7a553a';
          }
        }
        ctx.fillStyle = color;
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawStone = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x, y);
      let color = '#737373'; // Base stone grey
      if (r < 0.2) {
        color = '#555555'; // Dark grey
      } else if (r < 0.4) {
        color = '#8a8a8a'; // Light grey
      } else if (r < 0.5) {
        color = '#444444'; // Shadow grey
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawWoodSide = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x + 15, y + 25);
      let color = '#5c4033'; // Base bark brown
      const isBarkRidge = (x % 4 === 0) || ((x + Math.floor(y / 4)) % 5 === 2);
      if (isBarkRidge) {
        color = '#3e2a20'; // Dark ridge
      } else if (r < 0.2) {
        color = '#704f3f'; // Light wood highlight
      } else if (r < 0.4) {
        color = '#4a3328'; // Dark bark shadow
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawWoodTop = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let color = '#d7a15c'; // Base inner wood tan
      if (dist > 7) {
        color = '#5c4033'; // Dark outer bark
      } else if (dist > 5.5 && dist < 6.2) {
        color = '#b07a3e'; // Ring 3
      } else if (dist > 3.5 && dist < 4.2) {
        color = '#96632f'; // Ring 2
      } else if (dist > 1.5 && dist < 2.2) {
        color = '#805020'; // Ring 1
      } else if (dist < 1.0) {
        color = '#6b4118'; // Center ring
      } else {
        const r = pseudoRandom(x + 80, y + 90);
        if (r < 0.2) color = '#c9914d';
        else if (r < 0.4) color = '#e5b273';
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawLeaves = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, 16, 16);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x + 35, y + 45);
      if (r < 0.15) continue; // Transparent hole
      let color = '#2e5c1e'; // Base green
      if (r < 0.35) {
        color = '#1f3f14'; // Dark shadow
      } else if (r < 0.6) {
        color = '#3e7d28'; // Medium
      } else if (r < 0.8) {
        color = '#50a033'; // Highlight
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawGlass = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = 'rgba(224, 242, 254, 0.25)'; // semi-transparent body
  ctx.fillRect(1, 1, 14, 14);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // solid white border
  for (let x = 0; x < 16; x++) {
    ctx.fillRect(x, 0, 1, 1);
    ctx.fillRect(x, 15, 1, 1);
  }
  for (let y = 0; y < 16; y++) {
    ctx.fillRect(0, y, 1, 1);
    ctx.fillRect(15, y, 1, 1);
  }

  // Reflective stripes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(3, 12, 1, 1);
  ctx.fillRect(4, 11, 1, 1);
  ctx.fillRect(5, 10, 1, 1);

  ctx.fillRect(10, 5, 1, 1);
  ctx.fillRect(11, 4, 1, 1);
  ctx.fillRect(12, 3, 1, 1);
};

const drawOre = (ctx: CanvasRenderingContext2D, oreColor: string, highlightColor: string, shadowColor: string, seed: number) => {
  drawStone(ctx);
  
  const spotLayouts: Record<number, {x: number, y: number}[]> = {
    // Coal
    [BlockType.COAL]: [{x:2,y:3}, {x:3,y:3}, {x:3,y:4}, {x:10,y:6}, {x:11,y:6}, {x:11,y:7}, {x:12,y:7}, {x:4,y:11}, {x:5,y:11}, {x:5,y:12}, {x:11,y:2}, {x:12,y:2}, {x:9,y:12}, {x:10,y:13}],
    // Iron
    [BlockType.IRON]: [{x:3,y:2}, {x:4,y:2}, {x:4,y:3}, {x:9,y:5}, {x:10,y:5}, {x:11,y:6}, {x:2,y:10}, {x:3,y:10}, {x:3,y:11}, {x:12,y:12}, {x:13,y:12}, {x:10,y:11}],
    // Gold
    [BlockType.GOLD]: [{x:1,y:4}, {x:2,y:4}, {x:2,y:5}, {x:11,y:8}, {x:12,y:8}, {x:12,y:9}, {x:5,y:10}, {x:6,y:10}, {x:6,y:11}, {x:9,y:3}, {x:10,y:3}],
    // Diamond
    [BlockType.DIAMOND]: [{x:2,y:2}, {x:3,y:2}, {x:3,y:3}, {x:10,y:4}, {x:11,y:4}, {x:11,y:5}, {x:4,y:10}, {x:5,y:10}, {x:5,y:11}, {x:12,y:11}, {x:13,y:11}, {x:9,y:12}],
    // Redstone
    [BlockType.REDSTONE]: [
      {x:2,y:3}, {x:3,y:3}, {x:3,y:4}, {x:2,y:4},
      {x:10,y:6}, {x:11,y:6}, {x:11,y:7}, {x:12,y:7},
      {x:4,y:11}, {x:5,y:11}, {x:5,y:12}, {x:4,y:12},
      {x:11,y:2}, {x:12,y:2}, {x:12,y:3},
      {x:9,y:12}, {x:10,y:13}, {x:9,y:13}
    ]
  };

  const spots = spotLayouts[seed] || spotLayouts[BlockType.REDSTONE];
  spots.forEach(p => {
    const r = pseudoRandom(p.x + seed, p.y + seed);
    let col = oreColor;
    if (r < 0.25) {
      col = highlightColor;
    } else if (r < 0.5) {
      col = shadowColor;
    }
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, 1, 1);
  });
};

const drawObsidian = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x + 5, y + 15);
      let color = '#151329'; // Base deep purple-black
      if (r < 0.2) {
        color = '#251e3d';
      } else if (r < 0.35) {
        color = '#382b5c';
      } else if (r < 0.5) {
        color = '#0b0a17';
      } else if (r < 0.6) {
        color = '#1b112c';
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawPlank = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x, y);
      let color = '#b45309'; // Base oak brown
      
      const isHorizLine = (y === 3 || y === 7 || y === 11 || y === 15);
      const isVertCut = 
        (y < 4 && x === 4) ||
        (y >= 4 && y < 8 && x === 12) ||
        (y >= 8 && y < 12 && x === 6) ||
        (y >= 12 && x === 10);

      if (isHorizLine || isVertCut) {
        color = '#542603'; // Dark borders
      } else {
        if (r < 0.15) {
          color = '#d97706';
        } else if (r < 0.3) {
          color = '#92400e';
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawCobblestone = (ctx: CanvasRenderingContext2D) => {
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const r = pseudoRandom(x + 40, y + 40);
      let color = '#6b6b6b';
      
      const isMortar = 
        (y % 4 === 0 && x % 2 === 0) || 
        ((x + y) % 6 === 0) || 
        (x === 0 || y === 0 || x === 15 || y === 15);

      if (isMortar) {
        color = '#383838';
      } else {
        if (r < 0.25) {
          color = '#8a8a8a';
        } else if (r < 0.5) {
          color = '#525252';
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

const drawTorch = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#854d0e'; // stick
  ctx.fillRect(7, 6, 2, 7);
  ctx.fillStyle = '#451a03'; // dark bottom
  ctx.fillRect(7, 13, 2, 1);
  ctx.fillStyle = '#eab308'; // yellow tip
  ctx.fillRect(7, 5, 2, 1);

  // Fire flame
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(6, 2, 4, 3);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(7, 1, 2, 2);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(7, 3, 2, 2);
};

// Main generator cache to avoid redundant canvas rendering
const textureCache: Record<string, string> = {};

export const generateBlockTexture = (type: BlockType, face: 'top' | 'side' | 'bottom' = 'side'): string => {
  const cacheKey = `${type}_${face}`;
  if (textureCache[cacheKey]) {
    return textureCache[cacheKey];
  }

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case BlockType.GRASS:
      if (face === 'top') {
        drawGrassTop(ctx);
      } else if (face === 'bottom') {
        drawDirt(ctx);
      } else {
        drawGrassSide(ctx);
      }
      break;

    case BlockType.DIRT:
      drawDirt(ctx);
      break;

    case BlockType.STONE:
      drawStone(ctx);
      break;

    case BlockType.WOOD:
      if (face === 'top' || face === 'bottom') {
        drawWoodTop(ctx);
      } else {
        drawWoodSide(ctx);
      }
      break;

    case BlockType.LEAVES:
      drawLeaves(ctx);
      break;

    case BlockType.GLASS:
      drawGlass(ctx);
      break;

    case BlockType.COAL:
      drawOre(ctx, '#222222', '#3a3a3a', '#111111', BlockType.COAL);
      break;

    case BlockType.IRON:
      drawOre(ctx, '#d1a580', '#e3ca9f', '#a37c5e', BlockType.IRON);
      break;

    case BlockType.GOLD:
      drawOre(ctx, '#fcc21b', '#fdeb75', '#d09600', BlockType.GOLD);
      break;

    case BlockType.DIAMOND:
      drawOre(ctx, '#2ce3f4', '#a4fbfd', '#109fb3', BlockType.DIAMOND);
      break;

    case BlockType.REDSTONE:
      drawOre(ctx, '#ff2222', '#ff8c8c', '#aa0000', BlockType.REDSTONE);
      break;

    case BlockType.OBSIDIAN:
      drawObsidian(ctx);
      break;

    case BlockType.TORCH:
      drawTorch(ctx);
      break;

    case BlockType.PLANK:
      drawPlank(ctx);
      break;

    case BlockType.COBBLESTONE:
      drawCobblestone(ctx);
      break;

    default:
      // Fallback: fill with a solid color from BLOCK_DETAILS or basic grey
      ctx.fillStyle = '#737373';
      ctx.fillRect(0, 0, 16, 16);
  }

  const dataUrl = canvas.toDataURL('image/png');
  textureCache[cacheKey] = dataUrl;
  return dataUrl;
};

export const generateBlockTextureCanvas = (type: BlockType, face: 'top' | 'side' | 'bottom' = 'side'): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case BlockType.GRASS:
      if (face === 'top') {
        drawGrassTop(ctx);
      } else if (face === 'bottom') {
        drawDirt(ctx);
      } else {
        drawGrassSide(ctx);
      }
      break;

    case BlockType.DIRT:
      drawDirt(ctx);
      break;

    case BlockType.STONE:
      drawStone(ctx);
      break;

    case BlockType.WOOD:
      if (face === 'top' || face === 'bottom') {
        drawWoodTop(ctx);
      } else {
        drawWoodSide(ctx);
      }
      break;

    case BlockType.LEAVES:
      drawLeaves(ctx);
      break;

    case BlockType.GLASS:
      drawGlass(ctx);
      break;

    case BlockType.COAL:
      drawOre(ctx, '#222222', '#3a3a3a', '#111111', BlockType.COAL);
      break;

    case BlockType.IRON:
      drawOre(ctx, '#d1a580', '#e3ca9f', '#a37c5e', BlockType.IRON);
      break;

    case BlockType.GOLD:
      drawOre(ctx, '#fcc21b', '#fdeb75', '#d09600', BlockType.GOLD);
      break;

    case BlockType.DIAMOND:
      drawOre(ctx, '#2ce3f4', '#a4fbfd', '#109fb3', BlockType.DIAMOND);
      break;

    case BlockType.REDSTONE:
      drawOre(ctx, '#ff2222', '#ff8c8c', '#aa0000', BlockType.REDSTONE);
      break;

    case BlockType.OBSIDIAN:
      drawObsidian(ctx);
      break;

    case BlockType.TORCH:
      drawTorch(ctx);
      break;

    case BlockType.PLANK:
      drawPlank(ctx);
      break;

    case BlockType.COBBLESTONE:
      drawCobblestone(ctx);
      break;

    default:
      ctx.fillStyle = '#737373';
      ctx.fillRect(0, 0, 16, 16);
  }

  return canvas;
};
