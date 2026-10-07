export interface ImageSrcConfig {
  name: string;
  src: string;
  img?: HTMLImageElement;
}

// Generates a dark blue/grey atmospheric gradient canvas fallback
export function createFallbackGradientUrl(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#111827"); // dark gray-blue
    grad.addColorStop(0.5, "#1f2937"); // dark gray
    grad.addColorStop(1, "#0f172a"); // slate-900
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, i * 64 + 10, 256, 20);
    }
  }
  return canvas.toDataURL("image/jpeg");
}

export function loadImage(
  src: string | ImageSrcConfig,
  i: number,
  onLoad?: (img: HTMLImageElement, idx: number) => void
): Promise<ImageSrcConfig> {
  return new Promise((resolve) => {
    let config: ImageSrcConfig;
    if (typeof src === "string") {
      config = {
        name: "image" + i,
        src,
      };
    } else {
      config = src;
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; // Needed for WebGL cross-origin textures
    config.img = img;

    img.addEventListener("load", () => {
      if (typeof onLoad === "function") {
        onLoad(img, i);
      }
      resolve(config);
    });

    img.addEventListener("error", () => {
      console.warn(`Wallpaper not found (${config.src}), using fallback gradient`);
      const fallbackUrl = createFallbackGradientUrl();
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      fallbackImg.addEventListener("load", () => {
        config.img = fallbackImg;
        config.src = fallbackUrl;
        if (typeof onLoad === "function") {
          onLoad(fallbackImg, i);
        }
        resolve(config);
      });
      fallbackImg.addEventListener("error", () => {
        // Ultimate safe fallback
        resolve(config);
      });
      fallbackImg.src = fallbackUrl;
    });

    img.src = config.src;
  });
}

export function loadImages(
  images: Array<string | ImageSrcConfig>,
  onLoad?: (img: HTMLImageElement, idx: number) => void
): Promise<ImageSrcConfig[]> {
  return Promise.all(
    images.map((src, i) => loadImage(src, i, onLoad))
  );
}

export default function ImageLoader(
  images: Array<string | ImageSrcConfig>,
  onLoad?: (img: HTMLImageElement, idx: number) => void
): Promise<Record<string, { img: HTMLImageElement; src: string }>> {
  return new Promise((resolve) => {
    loadImages(images, onLoad).then((loadedImages) => {
      const r: Record<string, { img: HTMLImageElement; src: string }> = {};
      loadedImages.forEach((curImage) => {
        if (curImage.img) {
          r[curImage.name] = {
            img: curImage.img,
            src: curImage.src,
          };
        }
      });
      resolve(r);
    });
  });
}
