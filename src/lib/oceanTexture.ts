const BASE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/";

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = rej; img.src = src;
  });
}

/** Original dark-earth texture with oceans recoloured blue (via the water mask). Browser only. */
export async function buildOceanTexture(): Promise<string> {
  const [earth, water] = await Promise.all([load(`${BASE}earth-dark.jpg`), load(`${BASE}earth-water.png`)]);
  const W = 2048, H = 1024;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(water, 0, 0, W, H);
  const mask = ctx.getImageData(0, 0, W, H).data;
  ctx.drawImage(earth, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    const m = mask[i]! / 255; // 1 = water
    if (m === 0) continue;
    const y = Math.floor(i / 4 / W) / H;            // latitude band
    const lat = Math.abs(y - 0.5) * 2;              // 0 equator → 1 pole
    const lum = (p[i]! + p[i + 1]! + p[i + 2]!) / 765;
    const r = 14 + lat * 22 + lum * 40, g = 52 + lat * 30 + lum * 60, b = 104 + lat * 34 + lum * 70;
    p[i] = p[i]! * (1 - m) + r * m; p[i + 1] = p[i + 1]! * (1 - m) + g * m; p[i + 2] = p[i + 2]! * (1 - m) + b * m;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
}
