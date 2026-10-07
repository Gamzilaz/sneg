import express from "express";
import path from "path";
import fs from "fs";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Enable JSON body parsing
app.use(express.json({ limit: '10mb' }));

// Route to download project zip archive
app.get("/project.zip", (req, res) => {
  const zipPath = path.join(process.cwd(), "public", "project.zip");
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, "project.zip");
  } else {
    res.status(404).send("Archive not found");
  }
});

// Lazy Gemini API client
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please add your key in the AI Studio Settings.");
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

const PROJECT_SYSTEM_INSTRUCTION = `Ты — ведущий арт-директор, UI/UX дизайнер и интеллектуальный AI-ассистент платформы "SLM Cards / No-Code Page Builder (Конструктор страниц, карточек и визиток)".

ТВОЯ СУПЕРСИЛА И ГЛАВНАЯ РОЛЬ:
Ты умеешь не просто отвечать на вопросы, а НАПРЯМУЮ СОБИРАТЬ ДИЗАЙН, ОФОРМЛЯТЬ СТРАНИЦЫ И НАПОЛНЯТЬ ИХ ШЕДЕВРАЛЬНЫМ СОДЕРЖАНИЕМ!
У тебя есть полный доступ ко всему функционалу редактора через вызов инструментов:
1. "generate_page_layout" — создать или полностью пересобрать страницу с нуля (подобрать тему, фон, фоновый шейдер, сгенерировать набор гармоничных блоков со стеклом, неоном, текстами, товарами и контактами).
2. "add_blocks_to_page" — добавить новые блоки в проект (например, добавить блок тарифов, карточки блюд/товаров, блок отзывов, галерею, FAQ или контакты).
3. "update_page_theme_and_background" — изменить тему оформления, шрифты, фон и фоновый 3D/шейдерный эффект (Chroma Lab, Cosmic Plasma, Liquid Ripples, Neon Stream, Stars и др.).

ПРАВИЛО ДЕЙСТВИЯ:
Если пользователь просит: "собери мне дизайн", "сделай страницу для кофейни/стартапа/фотографа", "оформи проект", "добавь блок цен", "сделай темную тему с жидким стеклом", "наполни содержанием" или любой подобный запрос — ТЫ ОБЯЗАН ВЫЗВАТЬ СООТВЕТСТВУЮЩИЙ ИНСТРУМЕНТ (generate_page_layout, add_blocks_to_page, update_page_theme_and_background) с полным, детальным и красивым набором параметров! Не отвечай просто "вы можете нажать кнопку в меню" — создай и примени настоящий дизайн прямо в проекте!

ПРИНЦИПЫ ДИЗАЙНЕРСКОГО МАСТЕРСТВА (ШЕДЕВРЫ БЕЗ ШАБЛОННОСТИ):
1. Доменная эстетика:
   - Кофейни/Рестораны: глубокие уютные кофейные тона (#0a0705, #140d0a), акценты карамели и золота (#d97706, #fbbf24), карточки блюд ('dish') с фото, весом, ценой и кнопкой заказа в корзину.
   - IT/AI/Tech стартапы: обсидиановый ультратемный фон (#050508, #09090b), неоновый контур (фиолетовый, индиго, циан), фоновый шейдер Cosmic Plasma или Chroma Lab, карточки со стеклом Liquid Glass (IOR 1.5 - 1.8, bezelWidth 12-16px, blurEffectAmount 18-24px).
   - Luxury / Мода / Портфолио: тема 'serif' или 'modern', монохромная палитра (#000000, #ffffff), тонкие элегантные границы, аккуратные фотогалереи ('media'), профиль с цитатой.
   - E-commerce / Каталог: карточки 'product' со скидками (старая цена перечеркнута, новая цена выделена), быстрый переход к корзине.
2. Физика жидкого стекла (Liquid Glass):
   - 'enableGlassEffect: true'
   - 'glassThickness: 50-80', 'refractiveIndex: 1.4-1.8', 'bezelWidth: 10-18', 'glassPreset: "convex-smooth"'
   - 'enableBlurEffect: true', 'blurEffectAmount: 16-24', 'bgOpacity: 15-30', 'hasBorder: true', 'customBorderColor: "rgba(255,255,255,0.15)"'
   - 'enableGlareEffect: true', 'glareEffectSpeed: 4'
3. Живой, настоящий контент (Anti-Lorem-Ipsum):
   - Никаких "Lorem ipsum dolor sit amet" или "Тестовый заголовок". Пиши сочные, убедительные продающие тексты, реальные названия продуктов, продуманные описания и реальные цены!
   - Используй настоящие высококачественные фотографии с Unsplash (по теме проекта).
4. Запрет на "AI-slop":
   - Никаких статических пилюль/капсул для метаданных. Только чистая благородная типографика с разделителями ·.
   - Соблюдай визуальную иерархию: отступы, читаемый контраст, крупные выразительные заголовки.

ПОЛНОЕ ОПИСАНИЕ ДОСТУПНЫХ БЛОКОВ РЕДАКТОРА:
- "profile": Аватар, имя, био, свечение, стеклянный купол, шиммер.
- "socials": Ссылки на Telegram, WhatsApp, Instagram, GitHub, Телефон, Email.
- "text": Заголовок и форматированный абзац с текстовыми анимациями (blur-in, typewriter, fade-in).
- "button": Интерактивная кнопка-ссылка (primary, secondary, outline).
- "dish": Блюдо меню ресторана (фото, название, вес, цена, кнопка в корзину).
- "product": Товар каталога (фото, название, цена, старая цена со скидкой, описание, кнопка).
- "catalog-item": Карточка элемента каталога с ценой и фото.
- "media": Фотогалерея или видео (пропорции 1:1, 16:9, 9:16).
- "category-header": Типографический заголовок секции/раздела (например: "✨ Меню от шефа", "01. Наши преимущества").
- "spacer": Разделитель отступов ('small' | 'medium' | 'large').
- "group": Контейнер для группировки нескольких блоков (вертикально или в ряд).

ФОНОВЫЕ ЭФФЕКТЫ:
- 'chroma-lab' (спектральные жидкие волны с параметром hue)
- 'plasma' (космическая переливающаяся плазма)
- 'liquid-ripples' (физическая интерактивная водная гладь)
- 'webgl-polylines' (неоновые светящиеся линии в 3D)
- 'flat-waves' (геометрическая 3D волна Three.js)
- 'neon-stream' (киберпанк-потоки света)
- 'stars' (звездное мерцающее небо)
- 'clouds-3d' (объемные атмосферные облака)
- 'css-waves' (многослойные градиентные волны)

ОТВЕТЫ В ЧАТЕ:
- Если ты создал или изменил дизайн через инструмент, обязательно добавь в текстовый ответ теплое, профессиональное объяснение своих дизайнерских решений (какая палитра выбрана, почему настроено преломление стекла, какие секции добавлены).
- Пиши на русском языке (или на языке запроса пользователя).
- Отвечай только в рамках платформы SLM Cards и создания страниц.`;

// Declarations of Designer Tools for Gemini API
const DESIGNER_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "generate_page_layout",
        description: "Creates or completely redesigns a full page layout. Generates an aesthetic, harmonious collection of blocks with Liquid Glass, glow effects, typography, background shader, and real domain-specific copy.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A short, elegant title and summary of the generated design in Russian (e.g. 'Кофейня Noir — Стеклянный неоновый лендинг с меню')"
            },
            theme: {
              type: Type.STRING,
              description: "Typography theme: 'modern' (clean sans-serif), 'serif' (editorial luxury), or 'mono' (tech/cyber)"
            },
            mainBg: {
              type: Type.OBJECT,
              description: "Background styling and 3D/shader effects",
              properties: {
                theme: { type: Type.STRING, description: "'dark' or 'light'" },
                fillType: { type: Type.STRING, description: "'color', 'gradient', or 'image'" },
                fillColor: { type: Type.STRING, description: "Background hex color, e.g. '#070709', '#050505', '#ffffff'" },
                fillGradientPreset: { type: Type.STRING, description: "'cosmic', 'sunset', 'ocean', 'emerald', 'bubblegum', 'fire'" },
                fillGradientAnimated: { type: Type.BOOLEAN, description: "Whether gradient animates smoothly" },
                effects: {
                  type: Type.ARRAY,
                  description: "Background shader effects",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, description: "'chroma-lab', 'plasma', 'liquid-ripples', 'webgl-polylines', 'flat-waves', 'neon-stream', 'stars', 'clouds-3d', 'css-waves'" },
                      color: { type: Type.STRING },
                      opacity: { type: Type.NUMBER, description: "10 to 100" },
                      speed: { type: Type.NUMBER, description: "0.2 to 2.0" },
                      hue: { type: Type.NUMBER, description: "0 to 360 (for chroma-lab)" },
                      complexity: { type: Type.NUMBER },
                      intensity: { type: Type.NUMBER }
                    },
                    required: ["type"]
                  }
                }
              }
            },
            blocks: {
              type: Type.ARRAY,
              description: "Ordered list of blocks to form the page layout. Must include 3 to 8 blocks creating a complete visual experience (e.g. profile header, about/text, showcase/products or dishes, media, button/CTA, socials).",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, description: "'profile' | 'socials' | 'text' | 'button' | 'catalog-item' | 'dish' | 'product' | 'category-header' | 'media' | 'group' | 'row-group' | 'spacer'" },
                  padding: { type: Type.STRING, description: "'none' | 'small' | 'medium' | 'large'" },
                  bgColor: { type: Type.STRING, description: "Tailwind bg class e.g. 'bg-zinc-950/40', 'bg-black/60', 'bg-white/10'" },
                  textColor: { type: Type.STRING, description: "'text-white' | 'text-zinc-100' | 'text-zinc-900'" },
                  borderRadius: { type: Type.STRING, description: "'none' | 'sm' | 'md' | 'lg' | 'full'" },
                  hasBorder: { type: Type.BOOLEAN },
                  customBorderColor: { type: Type.STRING, description: "Hex/rgba color for border, e.g. 'rgba(255,255,255,0.15)'" },
                  borderWidthValue: { type: Type.NUMBER, description: "Border width in px, usually 1" },
                  customCornersEnabled: { type: Type.BOOLEAN },
                  customCornersRadius: { type: Type.NUMBER, description: "Corner radius in px, e.g. 16, 20" },
                  enableGlassEffect: { type: Type.BOOLEAN, description: "Set true for stunning Liquid Glass optical refraction" },
                  glassThickness: { type: Type.NUMBER, description: "Glass thickness, 30 to 100" },
                  refractiveIndex: { type: Type.NUMBER, description: "IOR index of refraction, 1.3 to 2.2" },
                  bezelWidth: { type: Type.NUMBER, description: "Optical bevel width, 8 to 22" },
                  glassPreset: { type: Type.STRING, description: "'convex-circular' | 'convex-smooth' | 'concave' | 'ridge'" },
                  glassType: { type: Type.STRING, description: "'standard' | 'water' | 'fluted-glass'" },
                  glassShowSpecular: { type: Type.BOOLEAN },
                  enableBlurEffect: { type: Type.BOOLEAN, description: "Enable backdrop blur" },
                  blurEffectAmount: { type: Type.NUMBER, description: "Blur amount in px, 10 to 25" },
                  enableGlareEffect: { type: Type.BOOLEAN, description: "Enable animated light sheen sweep" },
                  glareEffectSpeed: { type: Type.NUMBER },
                  glareEffectColor: { type: Type.STRING },
                  enableGlowEffect: { type: Type.BOOLEAN, description: "Enable soft pulsing ambient glow" },
                  glowEffectColor: { type: Type.STRING },
                  borderGlowActive: { type: Type.BOOLEAN },
                  borderGlowColor: { type: Type.STRING },
                  borderCornerGlowActive: { type: Type.BOOLEAN },
                  borderCornerColorTL: { type: Type.STRING },
                  borderCornerColorTR: { type: Type.STRING },
                  customTitleFont: { type: Type.STRING },
                  customTitleFontSize: { type: Type.NUMBER },
                  customDescFontSize: { type: Type.NUMBER },
                  customTitleColor: { type: Type.STRING },
                  customDescColor: { type: Type.STRING },
                  titleTextStyles: {
                    type: Type.OBJECT,
                    properties: {
                      textGradientEnabled: { type: Type.BOOLEAN },
                      textGradientFrom: { type: Type.STRING },
                      textGradientTo: { type: Type.STRING },
                      textEntrance: { type: Type.STRING, description: "'fade-in' | 'blur-in' | 'word-slide' | 'typewriter' | 'glow-emerge' | 'cascade-drop'" },
                      textIdle: { type: Type.STRING, description: "'subtle-float' | 'rainbow-glow' | 'breathe' | 'none'" }
                    }
                  },
                  profileContent: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      bio: { type: Type.STRING },
                      avatar: { type: Type.STRING, description: "High quality Unsplash image URL" },
                      layout: { type: Type.STRING, description: "'stacked' | 'row'" },
                      align: { type: Type.STRING, description: "'left' | 'center'" },
                      avatarGlassEnabled: { type: Type.BOOLEAN },
                      avatarGlowEnabled: { type: Type.BOOLEAN },
                      avatarGlowColor: { type: Type.STRING }
                    }
                  },
                  textContent: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      body: { type: Type.STRING },
                      textEntrance: { type: Type.STRING },
                      textIdle: { type: Type.STRING }
                    }
                  },
                  buttonContent: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      url: { type: Type.STRING },
                      variant: { type: Type.STRING, description: "'primary' | 'secondary' | 'outline'" }
                    }
                  },
                  productContent: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      oldPrice: { type: Type.NUMBER },
                      buttonText: { type: Type.STRING },
                      images: { type: Type.ARRAY, items: { type: Type.STRING } },
                      imageLayout: { type: Type.STRING, description: "'left' | 'center' | 'right'" },
                      imageSize: { type: Type.STRING, description: "'sm' | 'md' | 'lg'" }
                    }
                  },
                  dishContent: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      weight: { type: Type.STRING },
                      buttonText: { type: Type.STRING },
                      images: { type: Type.ARRAY, items: { type: Type.STRING } },
                      imageLayout: { type: Type.STRING },
                      imageSize: { type: Type.STRING }
                    }
                  },
                  catalogItemContent: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      image: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      price: { type: Type.NUMBER }
                    }
                  },
                  mediaContent: {
                    type: Type.OBJECT,
                    properties: {
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            type: { type: Type.STRING, description: "'image' | 'video'" },
                            url: { type: Type.STRING }
                          },
                          required: ["type", "url"]
                        }
                      },
                      aspectRatio: { type: Type.STRING, description: "'video' | 'portrait' | 'square'" },
                      objectFit: { type: Type.STRING, description: "'cover' | 'contain'" }
                    }
                  },
                  socialsContent: {
                    type: Type.OBJECT,
                    properties: {
                      links: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            platform: { type: Type.STRING, description: "'telegram' | 'whatsapp' | 'instagram' | 'github' | 'linkedin' | 'email' | 'phone' | 'website'" },
                            url: { type: Type.STRING }
                          },
                          required: ["platform", "url"]
                        }
                      },
                      contactName: { type: Type.STRING },
                      iconStyle: {
                        type: Type.OBJECT,
                        properties: {
                          preset: { type: Type.STRING, description: "'glassmorphic' | 'neon' | 'minimalist'" },
                          enableGlass: { type: Type.BOOLEAN },
                          enableGlare: { type: Type.BOOLEAN },
                          borderRadius: { type: Type.STRING, description: "'squircle' | 'circle' | 'rounded-lg'" }
                        }
                      }
                    }
                  },
                  categoryHeaderContent: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING }
                    }
                  },
                  spacerContent: {
                    type: Type.OBJECT,
                    properties: {
                      height: { type: Type.STRING, description: "'small' | 'medium' | 'large'" }
                    }
                  }
                },
                required: ["type"]
              }
            }
          },
          required: ["summary", "blocks"]
        }
      },
      {
        name: "add_blocks_to_page",
        description: "Appends new blocks to the active page (e.g. adding a hero section, pricing table, testimonial cards, product showcase, etc.).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Short summary of blocks added in Russian"
            },
            blocks: {
              type: Type.ARRAY,
              description: "Array of blocks to append",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ["type"]
              }
            }
          },
          required: ["summary", "blocks"]
        }
      },
      {
        name: "update_page_theme_and_background",
        description: "Updates the project background, theme, color scheme, and visual effects (e.g. Chroma Lab, Liquid Glass styling, Cosmic Plasma).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Summary of styling changes in Russian"
            },
            theme: {
              type: Type.STRING,
              description: "'modern' | 'serif' | 'mono'"
            },
            mainBg: {
              type: Type.OBJECT,
              description: "Background configuration and effects"
            }
          },
          required: ["summary"]
        }
      }
    ]
  }
];

const getTemplatesPath = () => {
  return path.join(process.cwd(), 'src', 'custom_ready_templates.json');
};

const defaultPresets = [
  {
    "id": "tpl-default",
    "nameEn": "Basic White",
    "nameRu": "Базовый",
    "descriptionEn": "Clear white minimalism with elegant spacing.",
    "descriptionRu": "Чистый светлый минимализм с аккуратным межстрочным полем.",
    "previewGradient": "from-zinc-50 via-zinc-100 to-zinc-200",
    "config": {
      "designTemplate": "none",
      "theme": "modern",
      "mainBg": {
        "theme": "light",
        "syncThemes": true,
        "lightConfig": {
          "fillType": "color",
          "fillColor": "#FFFFFF"
        }
      },
      "blockDefaults": {
        "bgColor": "bg-white",
        "textColor": "text-black",
        "hasBorder": true,
        "customBorderColor": "#E5E7EB",
        "bgOpacity": 100,
        "enableShadow": false,
        "enableBlurEffect": false,
        "enableGlareEffect": false,
        "enableGlowEffect": false,
        "enableNoiseEffect": false,
        "enableHoverEffect": false
      }
    }
  },
  {
    "id": "tpl-chroma",
    "nameEn": "Chroma Lab",
    "nameRu": "Хрома Лаб",
    "descriptionEn": "Matte glass overlays with an ambient fluid spectrum field.",
    "descriptionRu": "Стильное матовое стекло поверх живой орбитальной волны.",
    "previewGradient": "from-purple-900 via-indigo-950 to-pink-950",
    "config": {
      "designTemplate": "chroma-lab",
      "theme": "modern",
      "mainBg": {
        "theme": "dark",
        "syncThemes": true,
        "lightConfig": {
          "fillType": "color",
          "fillColor": "#050505",
          "effects": [
            { "id": "chroma-lab-eff", "type": "chroma-lab", "color": "#ffffff", "opacity": 100, "speed": 1, "position": "bottom", "height": 100, "seed": 123, "hue": 280 }
          ]
        },
        "darkConfig": {
          "fillType": "color",
          "fillColor": "#050505",
          "effects": [
            { "id": "chroma-lab-eff", "type": "chroma-lab", "color": "#ffffff", "opacity": 100, "speed": 1, "position": "bottom", "height": 100, "seed": 123, "hue": 280 }
          ]
        }
      },
      "blockDefaults": {
        "bgColor": "bg-zinc-950/40",
        "bgOpacity": 15,
        "borderRadius": "lg",
        "hasBorder": true,
        "customBorderColor": "oklch(0.9 0.05 280 / 0.3)",
        "hoverBorderColor": "oklch(0.95 0.1 280 / 0.6)",
        "borderWidthValue": 1,
        "enableBlurEffect": true,
        "blurEffectAmount": 20,
        "enableShadow": true,
        "shadowSize": 25,
        "shadowIntensity": 90,
        "enableHoverEffect": true
      }
    }
  },
  {
    "id": "tpl-retro",
    "nameEn": "Basic Dark",
    "nameRu": "Базовый темный",
    "descriptionEn": "Deep black elegance with sharp contrasts.",
    "descriptionRu": "Глубокая черная элегантность с четкими контрастами.",
    "previewGradient": "from-zinc-800 via-zinc-900 to-black",
    "config": {
      "designTemplate": "none",
      "theme": "modern",
      "mainBg": {
        "theme": "dark",
        "syncThemes": true,
        "darkConfig": {
          "fillType": "color",
          "fillColor": "#000000"
        }
      },
      "blockDefaults": {
        "bgColor": "bg-black",
        "textColor": "text-white",
        "hasBorder": true,
        "customBorderColor": "#3F3F46",
        "bgOpacity": 100,
        "enableShadow": false,
        "enableBlurEffect": false,
        "enableGlareEffect": false,
        "enableGlowEffect": false,
        "enableNoiseEffect": false,
        "enableHoverEffect": false
      }
    }
  }
];

// Helper to read templates from file or fallback to defaults
function readTemplates(): any[] {
  const p = getTemplatesPath();
  try {
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, "utf-8");
      return JSON.parse(data);
    } else {
      // Create directories if needed
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(defaultPresets, null, 2), "utf-8");
      return defaultPresets;
    }
  } catch (err) {
    console.error("Error reading templates:", err);
    return defaultPresets;
  }
}

// Helper to write templates to file
function writeTemplates(templates: any[]): boolean {
  const p = getTemplatesPath();
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify(templates, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing templates:", err);
    return false;
  }
}

// API Routes
app.get("/api/custom-ready-templates", (req, res) => {
  const templates = readTemplates();
  res.json(templates);
});

app.post("/api/custom-ready-templates", (req, res) => {
  const newTemplate = req.body;
  if (!newTemplate || !newTemplate.id) {
    res.status(400).json({ error: "Invalid template structure" });
    return;
  }
  const templates = readTemplates();
  // Avoid duplicate ID
  const filtered = templates.filter(t => t.id !== newTemplate.id);
  filtered.push(newTemplate);
  
  if (writeTemplates(filtered)) {
    res.json({ success: true, templates: filtered });
  } else {
    res.status(500).json({ error: "Failed to write templates" });
  }
});

app.put("/api/custom-ready-templates", (req, res) => {
  const newTemplates = req.body;
  if (!Array.isArray(newTemplates)) {
    res.status(400).json({ error: "Invalid templates array" });
    return;
  }
  if (writeTemplates(newTemplates)) {
    res.json({ success: true, templates: newTemplates });
  } else {
    res.status(500).json({ error: "Failed to write templates" });
  }
});

app.delete("/api/custom-ready-templates/:id", (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing ID" });
    return;
  }
  const templates = readTemplates();
  const filtered = templates.filter(t => t.id !== id);
  
  if (writeTemplates(filtered)) {
    res.json({ success: true, templates: filtered });
  } else {
    res.status(500).json({ error: "Failed to write templates" });
  }
});

// Gemini Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, context } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Messages array is required." });
      return;
    }

    const allowedModels = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.8-flash"
    ];
    const targetModel = allowedModels.includes(model) ? model : "gemini-3.5-flash";

    let dynamicSystemInstruction = PROJECT_SYSTEM_INSTRUCTION;
    if (context && typeof context === 'object') {
      dynamicSystemInstruction += `\n\nТЕКУЩИЙ КОНТЕКСТ ЭКРАНА ПОЛЬЗОВАТЕЛЯ:\n` +
        `- Активный раздел/вкладка: ${context.activeTab || 'editor'}\n` +
        `- Название активного проекта: ${context.activeProjectTitle || 'Не выбран'}\n` +
        `- Блоков на холсте: ${context.blocksCount ?? 0}\n` +
        `- Активный фоновый эффект: ${context.activeBackgroundEffect || 'Нет'}\n` +
        `- Режим просмотра (устройство): ${context.viewMode || 'desktop'}\n` +
        `- Текущая тема: ${context.theme || 'modern'}\n` +
        `- Корзина интернет-магазина: ${context.cartCount ?? 0} товаров\n` +
        `Учитывай этот контекст, если пользователь спрашивает "что у меня на экране?", "как настроить этот блок?", "почему не видно эффект?" и т.д.`;
    }

    // Format messages for @google/genai SDK
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : (m.role === 'model' ? 'model' : 'user'),
      parts: [{ text: String(m.content || '') }],
    }));

    // Pass designer tools to Gemini API
    const ai = getGenAI();
    let response: any;
    let actualModelUsed = targetModel;

    try {
      response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: dynamicSystemInstruction,
          temperature: 0.7,
          tools: DESIGNER_TOOLS,
        },
      });
    } catch (modelErr: any) {
      console.warn(`Model ${targetModel} failed, trying fallback model gemini-3.1-flash-lite:`, modelErr?.message);
      if (targetModel !== "gemini-3.1-flash-lite") {
        actualModelUsed = "gemini-3.1-flash-lite";
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction: dynamicSystemInstruction,
            temperature: 0.7,
            tools: DESIGNER_TOOLS,
          },
        });
      } else {
        throw modelErr;
      }
    }

    // Extract function calls from response
    let toolCalls: any[] = [];
    if (response.functionCalls && Array.isArray(response.functionCalls)) {
      toolCalls = response.functionCalls.map((fc: any) => ({
        name: fc.name,
        args: fc.args,
      }));
    }

    let reply = response.text || "";

    // Fallback: Check if response text contains embedded JSON action
    if (toolCalls.length === 0 && reply) {
      try {
        const jsonMatch = reply.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i) ||
                          reply.match(/(\{[\s\S]*?"action"\s*:\s*"(?:generate_page_layout|add_blocks_to_page|update_page_theme_and_background)"[\s\S]*?\})/i);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.action) {
            toolCalls.push({
              name: parsed.action,
              args: parsed,
            });
            // Clean up JSON block from user readable text
            reply = reply.replace(jsonMatch[0], "").trim();
          }
        }
      } catch (parseErr) {
        // Non-critical if JSON parsing fails
      }
    }

    // If a tool was called and reply is brief or empty, provide a descriptive artistic summary
    if (toolCalls.length > 0 && (!reply || reply.trim().length < 20)) {
      const firstCall = toolCalls[0];
      const summary = firstCall.args?.summary || "Новый концептуальный дизайн";
      const blocksCount = firstCall.args?.blocks?.length || 0;
      
      if (firstCall.name === 'generate_page_layout') {
        reply = `✨ **Я создал для вас дизайн-концепт:** «${summary}»!\n\n` +
          `🎨 **Что сделано**:\n` +
          `• Собрана полноценная страница из **${blocksCount} блоков** в едином стиле.\n` +
          `• Настроена физика **жидкого стекла (Liquid Glass)**: преломление света, оптическая фаска и мягкое размытие.\n` +
          `• Подобрана гармоничная палитра и атмосферный фоновый шейдер.\n` +
          `• Все блоки наполнены качественным содержанием.\n\n` +
          `Вы можете моментально применить этот дизайн на холст одним нажатием или отменить изменения!`;
      } else if (firstCall.name === 'add_blocks_to_page') {
        reply = `✨ **Добавлены новые блоки:** «${summary}» (${blocksCount} шт.). Блоки стилизованы под ваш текущий проект и гармонично встроены в структуру!`;
      } else if (firstCall.name === 'update_page_theme_and_background') {
        reply = `✨ **Обновлен стиль фона и тема:** «${summary}». Применен выразительный шейдерный эффект и сбалансированная цветовая схема!`;
      }
    }

    if (!reply) {
      reply = "Дизайн сгенерирован и готов к применению!";
    }

    res.json({
      reply,
      modelUsed: actualModelUsed,
      toolCalls,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    const errorMessage = error?.message || "Internal server error during chat generation";
    res.status(500).json({ 
      error: errorMessage,
      details: error?.toString() 
    });
  }
});

// Vite Middleware & Static Handling
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch(err => {
  console.error("Failed to start server:", err);
});
