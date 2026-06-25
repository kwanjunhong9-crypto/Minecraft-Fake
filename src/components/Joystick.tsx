import React, { useState, useRef, useEffect } from 'react';

interface JoystickProps {
  onMove: (data: { x: number; y: number }) => void;
  onEnd: () => void;
}

export default function Joystick({ onMove, onEnd }: JoystickProps) {
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    let stickX = dx;
    let stickY = dy;

    if (distance > maxRadius) {
      stickX = (dx / distance) * maxRadius;
      stickY = (dy / distance) * maxRadius;
    }

    setStickPos({ x: stickX, y: stickY });

    // Normalize output between -1 and 1
    onMove({
      x: stickX / maxRadius,
      y: stickY / maxRadius,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setStickPos({ x: 0, y: 0 });
    onEnd();
  };

  // Add global listeners just in case pointer leaves elements
  useEffect(() => {
    if (isDragging) {
      const globalMove = (e: PointerEvent) => handlePointerMove(e);
      const globalUp = () => handlePointerUp();

      window.addEventListener('pointermove', globalMove);
      window.addEventListener('pointerup', globalUp);

      return () => {
        window.removeEventListener('pointermove', globalMove);
        window.removeEventListener('pointerup', globalUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      id="mobile-joystick-container"
      ref={containerRef}
      className="relative w-28 h-28 rounded-full bg-black/40 backdrop-blur-xs border-2 border-white/20 flex items-center justify-center touch-none select-none"
      onPointerDown={handlePointerDown}
    >
      {/* Outer Rings */}
      <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />

      {/* Interactive Stick Knob */}
      <div
        id="mobile-joystick-knob"
        className={`w-12 h-12 rounded-full bg-white/70 shadow-lg flex items-center justify-center transition-transform duration-75 active:scale-95 ${
          isDragging ? 'bg-cyan-400/80 cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
        }}
      >
        <div className="w-4 h-4 rounded-full bg-white/40" />
      </div>
    </div>
  );
}
