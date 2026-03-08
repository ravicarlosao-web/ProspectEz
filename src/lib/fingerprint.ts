/**
 * Advanced browser fingerprinting that persists across:
 * - Incognito/private browsing
 * - Different browsers on same device
 * - Cleared cookies/storage
 * 
 * Uses canvas, WebGL, screen, timezone, and hardware signals.
 */

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("ProspectEz🔒", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("DeviceID", 4, 35);
    ctx.strokeStyle = "#ff0";
    ctx.arc(50, 25, 20, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";

    const glCtx = gl as WebGLRenderingContext;
    const debugInfo = glCtx.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? glCtx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown";
    const renderer = debugInfo ? glCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";

    return `${vendor}~${renderer}`;
  } catch {
    return "webgl-error";
  }
}

function getHardwareSignals(): string {
  const signals = [
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    window.devicePixelRatio,
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    navigator.maxTouchPoints || 0,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset(),
    navigator.platform,
  ];
  return signals.join("|");
}

function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) { resolve("no-audio"); return; }

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const analyser = ctx.createAnalyser();
      const gain = ctx.createGain();
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      gain.gain.value = 0; // Silent
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

      oscillator.connect(analyser);
      analyser.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      let result = "";
      processor.onaudioprocess = (e) => {
        const data = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(data);
        result = data.slice(0, 30).join(",");
        oscillator.disconnect();
        processor.disconnect();
        gain.disconnect();
        ctx.close();
        resolve(result || "audio-empty");
      };

      oscillator.start(0);
      
      // Timeout fallback
      setTimeout(() => {
        try { ctx.close(); } catch {}
        resolve(result || "audio-timeout");
      }, 500);
    } catch {
      resolve("audio-error");
    }
  });
}

function getFontFingerprint(): string {
  const testFonts = [
    "monospace", "sans-serif", "serif",
    "Arial", "Courier New", "Georgia", "Helvetica",
    "Times New Roman", "Verdana", "Impact", "Comic Sans MS",
    "Trebuchet MS", "Palatino", "Lucida Console"
  ];

  const baseFonts = ["monospace", "sans-serif", "serif"];
  const testString = "mmmmmmmmmmlli";
  const testSize = "72px";
  const span = document.createElement("span");
  span.style.fontSize = testSize;
  span.style.position = "absolute";
  span.style.left = "-9999px";
  span.style.top = "-9999px";
  span.textContent = testString;
  document.body.appendChild(span);

  const baseWidths: Record<string, number> = {};
  baseFonts.forEach((f) => {
    span.style.fontFamily = f;
    baseWidths[f] = span.offsetWidth;
  });

  const detected: string[] = [];
  testFonts.forEach((font) => {
    for (const base of baseFonts) {
      span.style.fontFamily = `'${font}', ${base}`;
      if (span.offsetWidth !== baseWidths[base]) {
        detected.push(font);
        break;
      }
    }
  });

  document.body.removeChild(span);
  return detected.join(",");
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateDeviceFingerprint(): Promise<string> {
  const [canvasFp, audioFp] = await Promise.all([
    getCanvasFingerprint(),
    getAudioFingerprint(),
  ]);

  const webglFp = getWebGLFingerprint();
  const hardwareFp = getHardwareSignals();
  const fontFp = getFontFingerprint();

  const combined = [canvasFp, webglFp, hardwareFp, audioFp, fontFp].join("|||");

  return hashString(combined);
}

// ==========================================
// Multi-storage persistent device token
// ==========================================
const STORAGE_KEY = "pez_device_token";

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setToLocalStorage(token: string) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch {}
}
function getFromLocalStorage(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function setToSessionStorage(token: string) {
  try { sessionStorage.setItem(STORAGE_KEY, token); } catch {}
}
function getFromSessionStorage(): string | null {
  try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function setToCookie(token: string) {
  try {
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${STORAGE_KEY}=${token}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}
}
function getFromCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`));
    return match ? match[1] : null;
  } catch { return null; }
}

function setToIndexedDB(token: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("pez_antiabuse", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("tokens")) {
          db.createObjectStore("tokens");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("tokens", "readwrite");
        tx.objectStore("tokens").put(token, "device");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      };
      req.onerror = () => resolve();
    } catch { resolve(); }
  });
}

function getFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("pez_antiabuse", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("tokens")) {
          db.createObjectStore("tokens");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("tokens", "readonly");
        const getReq = tx.objectStore("tokens").get("device");
        getReq.onsuccess = () => { db.close(); resolve(getReq.result || null); };
        getReq.onerror = () => { db.close(); resolve(null); };
      };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/**
 * Gets or creates a persistent device token stored across
 * localStorage, sessionStorage, cookies, and IndexedDB.
 * If ANY of them has a token, it restores all others.
 */
export async function getPersistentDeviceToken(): Promise<string | null> {
  const sources = [
    getFromLocalStorage(),
    getFromSessionStorage(),
    getFromCookie(),
    await getFromIndexedDB(),
  ];

  const existing = sources.find((s) => s && s.length > 10);
  if (existing) {
    // Restore to all storages
    setToLocalStorage(existing);
    setToSessionStorage(existing);
    setToCookie(existing);
    await setToIndexedDB(existing);
    return existing;
  }

  return null;
}

/**
 * Creates and persists a new device token across all storages.
 */
export async function createPersistentDeviceToken(): Promise<string> {
  const token = generateToken();
  setToLocalStorage(token);
  setToSessionStorage(token);
  setToCookie(token);
  await setToIndexedDB(token);
  return token;
}
