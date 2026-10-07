import React, { useEffect, useRef } from 'react';

export interface FrostShaderProps {
  frostness?: number;        // FROSTYNESS (e.g. 2.0) - strength of frost distortion
  colorize?: number;         // COLORIZE (0.0 to 1.0) - intensity of ice tinting
  colorRgb?: string;         // COLOR_RGB hex (default '#b3ffff' / 0.7, 1.0, 1.0)
  vignetteRadius?: number;   // Coverage of frost from edges to center (0.2 to 2.0)
  frostBlur?: number;        // Ice texture blur strength (0.0 to 10.0)
  bgBlur?: number;           // Background image blur strength (0.0 to 30.0)
  speed?: number;            // Animation speed
  image?: string;            // Background image URL (iChannel0)
  frostTextureUrl?: string;  // Custom noise/ice texture image URL (iChannel1)
  dynamicBgCanvasRef?: React.RefObject<HTMLCanvasElement | null>; // Dynamic canvas input (e.g. falling snow + background)
  width?: string | number;
  height?: string | number;
  className?: string;
  refreezeDuration?: number; // Total seconds for complete 100% trace-free refreeze (default: 15)
  wipeRadius?: number;       // Radius of finger wiping circle (default: 28)
  enableWipe?: boolean;      // Enable interactive glass wiping
}

const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_texCoord;

void main() {
  v_texCoord = (a_position + 1.0) * 0.5;
  v_texCoord.y = 1.0 - v_texCoord.y; // Flip Y for WebGL texture coordinate system
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Exact Shadmar & Custom Glass Refraction Shader with interactive soft wipe mask & dynamic blur
const FS_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_frostyness;   // Strength of frost distortion
uniform float u_colorize;     // Intensity of ice tinting
uniform vec3 u_colorRgb;      // Ice color RGB
uniform float u_vignetteRadius;
uniform float u_frostBlur;     // Ice texture blur factor
uniform float u_bgBlur;        // Background image blur factor

uniform sampler2D u_image;         // iChannel0 (Background Scene)
uniform sampler2D u_noiseTexture;  // iChannel1 (Frost / Ice Texture)
uniform sampler2D u_wipeMask;      // iChannel2 (Soft Circular Wipe Mask)
uniform bool u_hasImage;
uniform bool u_hasWipeMask;

varying vec2 v_texCoord;

// Isotropic Golden-Angle Gaussian Blur for ice noise texture (smooth, fast & artifact-free)
vec4 sampleNoiseBlur(vec2 uv, float blurRadius) {
    if (blurRadius <= 0.01) {
        return texture2D(u_noiseTexture, uv);
    }
    vec4 col = texture2D(u_noiseTexture, uv) * 0.25;
    float totalWeight = 0.25;
    
    float GOLDEN_ANGLE = 2.399963;
    float radiusStep = (blurRadius * 0.6) / min(u_resolution.x, u_resolution.y);
    
    // 8 optimized golden-angle spiral samples for smooth Gaussian blur
    for (int i = 1; i <= 8; i++) {
        float fi = float(i);
        float r = sqrt(fi / 8.0);
        float theta = fi * GOLDEN_ANGLE;
        vec2 offset = vec2(cos(theta), sin(theta)) * r * radiusStep;
        
        float weight = exp(-r * r * 2.5);
        col += texture2D(u_noiseTexture, uv + offset) * weight;
        totalWeight += weight;
    }
    return col / totalWeight;
}

// Isotropic Golden-Angle Gaussian Blur for background scene image
vec4 sampleImageBlur(vec2 uv, float blurRadius) {
    if (blurRadius <= 0.01) {
        return texture2D(u_image, clamp(uv, 0.001, 0.999));
    }
    vec4 col = texture2D(u_image, clamp(uv, 0.001, 0.999)) * 0.25;
    float totalWeight = 0.25;
    
    float GOLDEN_ANGLE = 2.399963;
    float radiusStep = (blurRadius * 0.6) / min(u_resolution.x, u_resolution.y);
    
    for (int i = 1; i <= 8; i++) {
        float fi = float(i);
        float r = sqrt(fi / 8.0);
        float theta = fi * GOLDEN_ANGLE;
        vec2 offset = vec2(cos(theta), sin(theta)) * r * radiusStep;
        
        float weight = exp(-r * r * 2.5);
        col += texture2D(u_image, clamp(uv + offset, 0.001, 0.999)) * weight;
        totalWeight += weight;
    }
    return col / totalWeight;
}

void main() {
    // Normalised coordinates [0..1]
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Sample wipe mask (1.0 = fully frozen frost, 0.0 = wiped clear glass)
    float wipeVal = 1.0;
    if (u_hasWipeMask) {
        vec4 wipeSample = texture2D(u_wipeMask, uv);
        wipeVal = clamp(wipeSample.a, 0.0, 1.0);
    }
    
    // Calculate vignette mask (from center to edges)
    vec2 lensRadius = vec2(0.65 * 1.5 * u_vignetteRadius, 0.05);
    float dist = distance(uv, vec2(0.5, 0.5));
    float vigfin = pow(1.0 - smoothstep(lensRadius.x, lensRadius.y, dist), 2.0);
    
    // Effective frost intensity modulated by user finger wiping
    float effectiveFrost = u_frostyness * wipeVal;
    float effectiveColorize = u_colorize * wipeVal;
    
    // INVERTED ICE TEXTURE BLUR WITH RADIAL GRADIENT TRANSITION:
    // Inverted vignette gradient (1.0 - vigfin) scales ice texture blur from clear center to outer frozen edges
    float localIceBlur = u_frostBlur * clamp((1.0 - vigfin) * wipeVal, 0.0, 1.0);
    
    // Sample the uploaded frost/ice texture with local radial blur
    vec4 d = sampleNoiseBlur(uv, localIceBlur);
    
    // Ultra-fast optical refraction slope calculation directly from raw noise texture
    vec2 texelSize = 2.0 / u_resolution.xy;
    float dR = texture2D(u_noiseTexture, uv + vec2(texelSize.x, 0.0)).r;
    float dL = texture2D(u_noiseTexture, uv - vec2(texelSize.x, 0.0)).r;
    float dU = texture2D(u_noiseTexture, uv + vec2(0.0, texelSize.y)).r;
    float dD = texture2D(u_noiseTexture, uv - vec2(0.0, texelSize.y)).r;
    
    vec2 slope = vec2(dL - dR, dD - dU);
    
    // Local refraction vector modulated by wipe mask
    vec2 texDisplacement = slope * 3.0 * 0.06 * effectiveFrost * vigfin;
    vec2 distortedUV = clamp(uv + texDisplacement, 0.001, 0.999);
    
    // BACKGROUND BLUR CALCULATIONS:
    // Combine base slider background blur with frost thickness dispersion
    float totalBgBlur = u_bgBlur + (effectiveFrost * 2.0 * vigfin);
    
    vec4 sceneColor;
    if (u_hasImage) {
        sceneColor = sampleImageBlur(distortedUV, totalBgBlur);
    } else {
        vec3 topCol = vec3(0.08, 0.12, 0.22);
        vec3 botCol = vec3(0.18, 0.28, 0.42);
        sceneColor = vec4(mix(topCol, botCol, distortedUV.y), 1.0);
    }
    
    // Ice mask intensity
    float frostPatternIntensity = max(d.r, max(d.g, d.b));
    float tintFactor = clamp(effectiveColorize * frostPatternIntensity * vigfin, 0.0, 0.95);
    
    // Combine scene color with frost overlay tint
    vec3 finalColor = mix(sceneColor.rgb, u_colorRgb, tintFactor);
    
    // Highlight edges along the texture grooves/lines
    float slopeMag = length(slope);
    float edgeHighlight = clamp(slopeMag * 2.0, 0.0, 1.0) * effectiveColorize * 0.4 * vigfin;
    finalColor += u_colorRgb * edgeHighlight;
    
    gl_FragColor = vec4(finalColor, sceneColor.a);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255.0,
        parseInt(result[2], 16) / 255.0,
        parseInt(result[3], 16) / 255.0,
      ]
    : [0.7, 1.0, 1.0];
};

// Helper to generate a clean, smooth frosted glass texture fallback (no Voronoi polygon cell lines)
function createProceduralIceTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Smooth frosted glass ripple waves (clean, organic grooves without sharp Voronoi cells)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      const wave1 = Math.sin(ny * 24.0 + Math.cos(nx * 14.0) * 3.0) * 0.5 + 0.5;
      const wave2 = Math.cos(nx * 28.0 - ny * 12.0) * 0.5 + 0.5;
      const val = Math.floor((wave1 * 0.6 + wave2 * 0.4) * 255);

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export const FrostShader: React.FC<FrostShaderProps> = ({
  frostness = 2.0,
  colorize = 0.8,
  colorRgb = '#b3ffff',
  vignetteRadius = 1.0,
  frostBlur = 3.0,
  bgBlur = 0.0,
  speed = 0.5,
  image,
  frostTextureUrl,
  dynamicBgCanvasRef,
  width = '100%',
  height = '100%',
  className = '',
  refreezeDuration = 15,
  wipeRadius = 28,
  enableWipe = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const imgTextureRef = useRef<WebGLTexture | null>(null);
  const noiseTextureRef = useRef<WebGLTexture | null>(null);
  const wipeTextureRef = useRef<WebGLTexture | null>(null);
  const wipeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wipeCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageLoadedRef = useRef<boolean>(false);

  const isWipingRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastWipeTimeRef = useRef<number>(0);

  // Dynamic Uniform Refs to prevent WebGL program teardown/recompile on slider & cycle updates
  const frostnessRef = useRef(frostness);
  frostnessRef.current = frostness;
  const colorizeRef = useRef(colorize);
  colorizeRef.current = colorize;
  const colorRgbRef = useRef(colorRgb);
  colorRgbRef.current = colorRgb;
  const vignetteRadiusRef = useRef(vignetteRadius);
  vignetteRadiusRef.current = vignetteRadius;
  const frostBlurRef = useRef(frostBlur);
  frostBlurRef.current = frostBlur;
  const bgBlurRef = useRef(bgBlur);
  bgBlurRef.current = bgBlur;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const refreezeDurationRef = useRef(refreezeDuration);
  refreezeDurationRef.current = refreezeDuration;
  const wipeRadiusRef = useRef(wipeRadius);
  wipeRadiusRef.current = wipeRadius;
  const enableWipeRef = useRef(enableWipe);
  enableWipeRef.current = enableWipe;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: false });
    if (!gl) {
      console.warn('WebGL not supported for FrostShader');
      return;
    }

    // Initialize offscreen Wipe Mask Canvas (100% frozen initially)
    if (!wipeCanvasRef.current) {
      const wCanvas = document.createElement('canvas');
      wCanvas.width = canvas.width || 800;
      wCanvas.height = canvas.height || 600;
      const wCtx = wCanvas.getContext('2d');
      if (wCtx) {
        wCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        wCtx.fillRect(0, 0, wCanvas.width, wCanvas.height);
      }
      wipeCanvasRef.current = wCanvas;
      wipeCtxRef.current = wCtx;
    }

    // Shader compiler helper
    const createShader = (glCtx: WebGLRenderingContext, type: number, source: string) => {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compile error:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full screen quad buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uFrostynessLoc = gl.getUniformLocation(program, 'u_frostyness');
    const uColorizeLoc = gl.getUniformLocation(program, 'u_colorize');
    const uColorRgbLoc = gl.getUniformLocation(program, 'u_colorRgb');
    const uVignetteRadiusLoc = gl.getUniformLocation(program, 'u_vignetteRadius');
    const uFrostBlurLoc = gl.getUniformLocation(program, 'u_frostBlur');
    const uBgBlurLoc = gl.getUniformLocation(program, 'u_bgBlur');
    const uImageLoc = gl.getUniformLocation(program, 'u_image');
    const uNoiseTextureLoc = gl.getUniformLocation(program, 'u_noiseTexture');
    const uWipeMaskLoc = gl.getUniformLocation(program, 'u_wipeMask');
    const uHasImageLoc = gl.getUniformLocation(program, 'u_hasImage');
    const uHasWipeMaskLoc = gl.getUniformLocation(program, 'u_hasWipeMask');

    // Create & Upload iChannel1 (Organic Ice Noise Texture)
    const noiseTex = gl.createTexture();
    noiseTextureRef.current = noiseTex;
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (frostTextureUrl) {
      const noiseImg = new Image();
      noiseImg.crossOrigin = 'anonymous';
      noiseImg.onload = () => {
        if (!gl || !noiseTex) return;
        gl.bindTexture(gl.TEXTURE_2D, noiseTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseImg);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };
      noiseImg.onerror = () => {
        const iceCanvas = createProceduralIceTexture();
        gl.bindTexture(gl.TEXTURE_2D, noiseTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, iceCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      };
      noiseImg.src = frostTextureUrl;
    } else {
      const iceCanvas = createProceduralIceTexture();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, iceCanvas);
    }

    // Create & Upload iChannel2 (Interactive Wipe Mask Texture)
    const wipeTex = gl.createTexture();
    wipeTextureRef.current = wipeTex;
    gl.bindTexture(gl.TEXTURE_2D, wipeTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (wipeCanvasRef.current) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wipeCanvasRef.current);
    }

    // Create iChannel0 (Background Image)
    const imgTex = gl.createTexture();
    imgTextureRef.current = imgTex;
    imageLoadedRef.current = false;

    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!gl || !imgTex) return;
        gl.bindTexture(gl.TEXTURE_2D, imgTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        imageLoadedRef.current = true;
      };
      img.onerror = () => {
        imageLoadedRef.current = false;
      };
      img.src = image;
    }

    // Soft feathered circular stroke drawing helper
    const drawSoftWipeStroke = (x1: number, y1: number, x2: number, y2: number) => {
      const wCtx = wipeCtxRef.current;
      const wCanvas = wipeCanvasRef.current;
      if (!wCtx || !wCanvas) return;

      lastWipeTimeRef.current = performance.now();

      const dist = Math.hypot(x2 - x1, y2 - y1);
      const effectiveRadius = wipeRadiusRef.current * (wCanvas.width / (container.clientWidth || 1000));
      const steps = Math.max(1, Math.ceil(dist / (effectiveRadius * 0.15)));

      wCtx.save();
      wCtx.globalCompositeOperation = 'destination-out';

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;

        const grad = wCtx.createRadialGradient(px, py, 0, px, py, effectiveRadius);
        grad.addColorStop(0.00, 'rgba(0, 0, 0, 0.90)');  // Soft inner clear center
        grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.65)');  // Gentle inner core transition
        grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.30)');  // Smooth mid falloff
        grad.addColorStop(0.82, 'rgba(0, 0, 0, 0.08)');  // Ultra-soft margin
        grad.addColorStop(1.00, 'rgba(0, 0, 0, 0.00)');  // Feathered outer edge with zero hard cuts

        wCtx.fillStyle = grad;
        wCtx.beginPath();
        wCtx.arc(px, py, effectiveRadius, 0, Math.PI * 2);
        wCtx.fill();
      }

      wCtx.restore();
    };

    // Ignore clicks on UI buttons/controls
    const isInteractiveElement = (target: HTMLElement | null): boolean => {
      let curr = target;
      while (curr && curr !== document.body) {
        const tagName = curr ? curr.tagName.toLowerCase() : '';
        if (
          tagName === 'button' ||
          tagName === 'input' ||
          tagName === 'a' ||
          tagName === 'select' ||
          tagName === 'textarea' ||
          curr?.classList.contains('cursor-pointer') ||
          curr?.getAttribute('role') === 'button'
        ) {
          return true;
        }
        if (
          tagName === 'section' ||
          curr?.id === 'weather-cockpit' ||
          curr?.classList.contains('bg-black/55')
        ) {
          return true;
        }
        curr = curr ? curr.parentElement : null;
      }
      return false;
    };

    const getCanvasPos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const wCanvas = wipeCanvasRef.current;
      if (!wCanvas) return { x: 0, y: 0 };
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      return {
        x: (relX / rect.width) * wCanvas.width,
        y: (relY / rect.height) * wCanvas.height,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!enableWipeRef.current) return;
      if (isInteractiveElement(e.target as HTMLElement)) return;
      isWipingRef.current = true;
      const pos = getCanvasPos(e.clientX, e.clientY);
      lastPointerPosRef.current = pos;
      drawSoftWipeStroke(pos.x, pos.y, pos.x, pos.y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isWipingRef.current || !enableWipeRef.current) return;
      const pos = getCanvasPos(e.clientX, e.clientY);
      if (lastPointerPosRef.current) {
        drawSoftWipeStroke(lastPointerPosRef.current.x, lastPointerPosRef.current.y, pos.x, pos.y);
      }
      lastPointerPosRef.current = pos;
    };

    const handlePointerUp = () => {
      isWipingRef.current = false;
      lastPointerPosRef.current = null;
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      // Cap DPR to 0.75 on mobile and 1.0 on desktop for WebGL frost post-processing shaders:
      // High-DPI mobile devices (2x/3x DPR) render smoothly without GPU overheating or frame drops
      const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const dpr = isMobile ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.0);
      const w = Math.floor(rect.width * dpr) || 800;
      const h = Math.floor(rect.height * dpr) || 600;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);

        if (wipeCanvasRef.current) {
          wipeCanvasRef.current.width = w;
          wipeCanvasRef.current.height = h;
          if (wipeCtxRef.current) {
            wipeCtxRef.current.fillStyle = 'rgba(255, 255, 255, 1.0)';
            wipeCtxRef.current.fillRect(0, 0, w, h);
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    const startTime = performance.now();
    let lastFrameTime = performance.now();

    // Render loop
    const render = () => {
      if (!gl || !canvas) return;

      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrameTime) * 0.001);
      lastFrameTime = now;

      const currentTime = (now - startTime) * 0.001 * speedRef.current;

      // Smooth continuous refreezing with smooth ease-out curve (no abrupt jump or threshold snap)
      if (refreezeDurationRef.current > 0 && wipeCtxRef.current && wipeCanvasRef.current) {
        const wCtx = wipeCtxRef.current;
        const wCanvas = wipeCanvasRef.current;

        wCtx.save();
        wCtx.globalCompositeOperation = 'source-over';

        // Smooth alpha recovery per frame; canvas source-over compositing automatically tapers off as alpha approaches 1.0
        const alphaStep = (dt / refreezeDurationRef.current) * 5.2;
        wCtx.fillStyle = `rgba(255, 255, 255, ${alphaStep})`;
        wCtx.fillRect(0, 0, wCanvas.width, wCanvas.height);

        wCtx.restore();
      }

      gl.useProgram(program);

      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(uTimeLoc, currentTime);
      gl.uniform1f(uFrostynessLoc, frostnessRef.current);
      gl.uniform1f(uColorizeLoc, colorizeRef.current);
      gl.uniform1f(uVignetteRadiusLoc, vignetteRadiusRef.current);
      gl.uniform1f(uFrostBlurLoc, frostBlurRef.current);
      gl.uniform1f(uBgBlurLoc, bgBlurRef.current);

      const [r, g, b] = hexToRgb(colorRgbRef.current);
      gl.uniform3f(uColorRgbLoc, r, g, b);

      // Bind iChannel1 (Noise Texture) to Texture Unit 1
      if (noiseTextureRef.current) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noiseTextureRef.current);
        gl.uniform1i(uNoiseTextureLoc, 1);
      }

      // Bind iChannel2 (Wipe Mask Texture) to Texture Unit 2
      if (wipeTextureRef.current && wipeCanvasRef.current) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, wipeTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wipeCanvasRef.current);
        gl.uniform1i(uWipeMaskLoc, 2);
        gl.uniform1i(uHasWipeMaskLoc, 1);
      } else {
        gl.uniform1i(uHasWipeMaskLoc, 0);
      }

      // Bind iChannel0 (Main Background Image or Dynamic Snow Canvas) to Texture Unit 0
      if (dynamicBgCanvasRef?.current && imgTextureRef.current) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dynamicBgCanvasRef.current);
        gl.uniform1i(uImageLoc, 0);
        gl.uniform1i(uHasImageLoc, 1);
      } else if (imageLoadedRef.current && imgTextureRef.current) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgTextureRef.current);
        gl.uniform1i(uImageLoc, 0);
        gl.uniform1i(uHasImageLoc, 1);
      } else {
        gl.uniform1i(uHasImageLoc, 0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (imgTextureRef.current && gl) gl.deleteTexture(imgTextureRef.current);
      if (noiseTextureRef.current && gl) gl.deleteTexture(noiseTextureRef.current);
      if (wipeTextureRef.current && gl) gl.deleteTexture(wipeTextureRef.current);
      if (program && gl) gl.deleteProgram(program);
    };
  }, [image, frostTextureUrl, dynamicBgCanvasRef]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
    </div>
  );
};

export const frostPresets = [
  {
    name: 'Frosted Glass II (Shadmar)',
    params: {
      frostness: 2.0,
      colorize: 0.8,
      colorRgb: '#b3ffff',
      vignetteRadius: 1.0,
      speed: 0.5,
    },
  },
  {
    name: 'Deep Ice Vignette',
    params: {
      frostness: 3.5,
      colorize: 1.0,
      colorRgb: '#80e5ff',
      vignetteRadius: 1.2,
      speed: 0.8,
    },
  },
  {
    name: 'Light Window Frost',
    params: {
      frostness: 1.2,
      colorize: 0.4,
      colorRgb: '#e6ffff',
      vignetteRadius: 0.8,
      speed: 0.3,
    },
  },
];

