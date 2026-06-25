import React from 'react';
import { BlockType } from '../types';
import { generateBlockTexture } from '../utils/textureGenerator';

interface BlockSpriteProps {
  type: BlockType;
  size?: 'sm' | 'md' | 'lg';
}

export const BlockSprite: React.FC<BlockSpriteProps> = ({ type, size = 'md' }) => {
  // Get textures for top and side faces
  const topTexture = generateBlockTexture(type, 'top');
  const sideTexture = generateBlockTexture(type, 'side');

  // Determine wrapper and cube dimensions based on size
  let wrapperClass = 'w-8 h-8';
  let cubeSize = 'w-5 h-5';
  let translateZ = '10px'; // half of 20px (w-5 is 20px)

  if (size === 'sm') {
    wrapperClass = 'w-5 h-5';
    cubeSize = 'w-3 h-3';
    translateZ = '6px'; // half of 12px (w-3 is 12px)
  } else if (size === 'lg') {
    wrapperClass = 'w-12 h-12';
    cubeSize = 'w-7 h-7';
    translateZ = '14px'; // half of 28px (w-7 is 28px)
  }

  // Torch is non-solid and renders better as a flat pixel-art sprite
  if (type === BlockType.TORCH) {
    const torchClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    return (
      <div className={`${wrapperClass} flex items-center justify-center`}>
        <div
          className={`${torchClass} bg-contain bg-no-repeat bg-center`}
          style={{
            backgroundImage: `url(${sideTexture})`,
            imageRendering: 'pixelated',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${wrapperClass} flex items-center justify-center relative overflow-visible`}>
      <div
        className={cubeSize}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(-28deg) rotateY(45deg)',
          width: size === 'sm' ? '12px' : size === 'lg' ? '28px' : '20px',
          height: size === 'sm' ? '12px' : size === 'lg' ? '28px' : '20px',
        }}
      >
        {/* Top Face */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${topTexture})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated',
            transform: `rotateX(90deg) translateZ(${translateZ})`,
          }}
        />
        {/* Left Face */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${sideTexture})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated',
            transform: `rotateY(-90deg) translateZ(${translateZ})`,
            filter: 'brightness(0.70)', // shadow side
          }}
        />
        {/* Right (Front-Facing) Face */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${sideTexture})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated',
            transform: `translateZ(${translateZ})`,
            filter: 'brightness(0.95)', // bright side
          }}
        />
      </div>
    </div>
  );
};
