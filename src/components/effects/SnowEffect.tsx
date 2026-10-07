import React, { useEffect, useRef } from 'react';

export interface SnowEffectProps {
  enabled?: boolean;
  count?: number;          // Density / number of flakes
  size?: number;           // Flake base size in px (1 - 10)
  sizeVariation?: number;  // Flake size diversity (0.0 - 1.0)
  speed?: number;          // Falling speed multiplier (0.1 - 5.0)
  wind?: number;           // Horizontal wind force (-50 to +50)
  turbulence?: number;     // Sway / velocity trajectory turbulence (0.0 - 3.0)
  opacity?: number;        // Flake opacity (0.1 - 1.0)
  backgroundImageUrl?: string; // Optional background image to render underneath flakes
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  baseSpeedY: number;
  speedVarY: number;       // Individual Y velocity factor (0.7 - 1.3)
  speedVarX: number;       // Individual X drift factor (0.6 - 1.4)
  gustFactor: number;      // Responsiveness to random wind gusts
  phase: number;
  swaySpeed: number;
  swayAmp: number;
  opacity: number;
  layer: number; // 0: background, 1: midground, 2: foreground
}

// Pre-render offscreen sprite canvas for soft radial glow foreground flakes
function createGlowSprite(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.5, 'rgba(235, 248, 255, 0.7)');
    grad.addColorStop(1, 'rgba(220, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

let cachedGlowSprite: HTMLCanvasElement | null = null;
function getGlowSprite(): HTMLCanvasElement {
  if (!cachedGlowSprite) {
    cachedGlowSprite = createGlowSprite();
  }
  return cachedGlowSprite;
}

// Clamp particle count on smaller / mobile screens for locked 60 FPS performance
function getAdaptiveCount(requestedCount: number, width: number): number {
  const isMobile = width < 768 || (typeof window !== 'undefined' && window.innerWidth < 768);
  if (isMobile) {
    return Math.min(requestedCount, 300);
  }
  return Math.min(requestedCount, 1200);
}

export const SnowEffect: React.FC<SnowEffectProps> = ({
  enabled = true,
  count = 350,
  size = 3.5,
  sizeVariation = 0.6,
  speed = 1.2,
  wind = 5,
  turbulence = 1.0,
  opacity = 0.85,
  backgroundImageUrl,
  canvasRef: externalCanvasRef,
  className = '',
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const flakesRef = useRef<Snowflake[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const countRef = useRef(count);
  countRef.current = count;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const sizeVariationRef = useRef(sizeVariation);
  sizeVariationRef.current = sizeVariation;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const windRef = useRef(wind);
  windRef.current = wind;
  const turbulenceRef = useRef(turbulence);
  turbulenceRef.current = turbulence;
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  // Smooth parallax tracking refs
  const targetParallaxRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentParallaxRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse & Gyro parallax event listeners (lightweight & throttled)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetParallaxRef.current = {
        x: (e.clientX / w) * 2 - 1,
        y: (e.clientY / h) * 2 - 1,
      };
    };

    let lastOrientation = 0;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const now = performance.now();
      if (now - lastOrientation < 33) return; // Throttle gyro updates to ~30fps for smooth GPU performance
      lastOrientation = now;

      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      let rawX = gamma * 0.15;
      let rawY = (beta - 50) * 0.15;
      const verticalDampen = Math.max(0, 1.0 - Math.abs(Math.sin((beta * Math.PI) / 180.0)) * 0.5);
      rawX *= verticalDampen;
      targetParallaxRef.current = {
        x: Math.max(-1.0, Math.min(1.0, rawX)),
        y: Math.max(-1.0, Math.min(1.0, rawY)),
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Load background image if provided
  useEffect(() => {
    if (backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgImageRef.current = img;
      };
      img.src = backgroundImageUrl;
    } else {
      bgImageRef.current = null;
    }
  }, [backgroundImageUrl]);

  // Create clean round snowflake particles
  const createFlake = (width: number, height: number): Snowflake => {
    const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.5 ? 1 : 0;
    const sizeFactor = 1 + (Math.random() * 2 - 1) * sizeVariationRef.current;
    const layerScale = layer === 2 ? 1.4 : layer === 1 ? 1.0 : 0.6;
    const finalSize = Math.max(0.8, sizeRef.current * sizeFactor * layerScale);

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: finalSize,
      baseSpeedY: (0.4 + Math.random() * 0.9) * (layer === 2 ? 1.3 : layer === 1 ? 1.0 : 0.7),
      speedVarY: 0.7 + Math.random() * 0.6,
      speedVarX: 0.6 + Math.random() * 0.8,
      gustFactor: 0.5 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      swaySpeed: 0.008 + Math.random() * 0.025,
      swayAmp: (8 + Math.random() * 24) * (layer === 2 ? 1.3 : 0.8),
      opacity: (0.3 + Math.random() * 0.7) * (layer === 2 ? 1.0 : layer === 1 ? 0.8 : 0.5),
      layer,
    };
  };

  const initFlakes = (width: number, height: number, totalCount: number) => {
    const targetCount = getAdaptiveCount(totalCount, width);
    const newFlakes: Snowflake[] = [];
    for (let i = 0; i < targetCount; i++) {
      newFlakes.push(createFlake(width, height));
    }
    flakesRef.current = newFlakes;
  };

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    initFlakes(width, height, count);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      const targetCount = getAdaptiveCount(countRef.current, width);
      if (flakesRef.current.length < targetCount) {
        initFlakes(width, height, countRef.current);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const glowSprite = getGlowSprite();
    let lastTime = performance.now();

    const render = (time: number) => {
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth lerp parallax coordinates
      currentParallaxRef.current.x += (targetParallaxRef.current.x - currentParallaxRef.current.x) * 0.08;
      currentParallaxRef.current.y += (targetParallaxRef.current.y - currentParallaxRef.current.y) * 0.08;
      const px = currentParallaxRef.current.x;
      const py = currentParallaxRef.current.y;

      // Render background image with smooth parallax offset if provided
      if (bgImageRef.current && bgImageRef.current.complete) {
        const img = bgImageRef.current;
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;

        const parallaxScale = 1.08;
        let baseW = width * parallaxScale;
        let baseH = height * parallaxScale;

        if (canvasRatio > imgRatio) {
          baseH = baseW / imgRatio;
        } else {
          baseW = baseH * imgRatio;
        }

        const maxShiftX = (baseW - width) * 0.5;
        const maxShiftY = (baseH - height) * 0.5;

        const offX = (width - baseW) / 2 + px * maxShiftX * 0.7;
        const offY = (height - baseH) / 2 + py * maxShiftY * 0.7;

        ctx.drawImage(img, offX, offY, baseW, baseH);
      }

      // Adaptive flake count management
      const targetCount = getAdaptiveCount(countRef.current, width);
      const currentFlakes = flakesRef.current;
      if (currentFlakes.length < targetCount) {
        const toAdd = targetCount - currentFlakes.length;
        for (let i = 0; i < toAdd; i++) {
          currentFlakes.push(createFlake(width, height));
        }
      } else if (currentFlakes.length > targetCount) {
        currentFlakes.length = targetCount;
      }

      const windForce = (windRef.current / 10) * 15;
      const currentSpeedProp = speedRef.current;
      const currentTurbulenceProp = turbulenceRef.current;
      const currentOpacityProp = opacityRef.current;

      const dynamicGust = Math.sin(time * 0.0012) * 0.35 + Math.cos(time * 0.0027 + 1.2) * 0.25;

      // --- SINGLE PASS HIGH-PERFORMANCE RENDER & BATCHING ---
      // Distant & Midground flakes path (Layers 0 & 1)
      ctx.fillStyle = `rgba(240, 250, 255, ${0.85 * currentOpacityProp})`;
      ctx.beginPath();

      for (let i = 0; i < currentFlakes.length; i++) {
        const flake = currentFlakes[i];

        // Physics update
        const speedPulse = 1 + Math.sin(time * 0.002 + flake.phase) * 0.2;
        const currentSpeedY = flake.baseSpeedY * flake.speedVarY * speedPulse * currentSpeedProp * 60 * deltaTime;
        flake.y += currentSpeedY;

        flake.phase += flake.swaySpeed * currentTurbulenceProp * 60 * deltaTime;
        const swayX = Math.sin(flake.phase) * (flake.swayAmp * 0.05 * currentTurbulenceProp * flake.speedVarX);
        const effectiveWind = windForce + dynamicGust * 8 * flake.gustFactor;
        const windX = effectiveWind * flake.speedVarX * (flake.layer === 2 ? 1.3 : flake.layer === 1 ? 1.0 : 0.7) * deltaTime;
        flake.x += swayX + windX;

        // Boundary wrap
        if (flake.y > height + flake.size * 2) {
          flake.y = -flake.size * 2;
          flake.x = Math.random() * width;
        }
        if (flake.x > width + flake.size * 2) {
          flake.x = -flake.size * 2;
        } else if (flake.x < -flake.size * 2) {
          flake.x = width + flake.size * 2;
        }

        // Batch layers 0 and 1 into a single path call
        if (flake.layer < 2) {
          const layerOffset = flake.layer === 1 ? 8 : 3;
          const renderX = flake.x + px * layerOffset;
          const renderY = flake.y + py * layerOffset;
          ctx.moveTo(renderX + flake.size, renderY);
          ctx.arc(renderX, renderY, flake.size, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Foreground Layer 2 (soft glow circles) - Batch 2
      ctx.globalAlpha = Math.min(1.0, 0.95 * currentOpacityProp);
      for (let i = 0; i < currentFlakes.length; i++) {
        const flake = currentFlakes[i];
        if (flake.layer === 2) {
          const drawRadius = flake.size * 1.5;
          const renderX = flake.x + px * 16;
          const renderY = flake.y + py * 16;
          ctx.drawImage(
            glowSprite,
            renderX - drawRadius,
            renderY - drawRadius,
            drawRadius * 2,
            drawRadius * 2
          );
        }
      }
      ctx.globalAlpha = 1.0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-10 block ${className}`}
    />
  );
};

export default SnowEffect;
