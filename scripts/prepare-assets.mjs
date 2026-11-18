import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
await mkdir(new URL('public/textures/', root), { recursive: true });
await mkdir(new URL('.asset-cache/', root), { recursive: true });
const maps = {
  mercury: '2k_mercury.jpg', venus: '2k_venus_atmosphere.jpg', earth: '2k_earth_daymap.jpg',
  mars: '2k_mars.jpg', jupiter: '2k_jupiter.jpg', saturn: '2k_saturn.jpg',
  uranus: '2k_uranus.jpg', neptune: '2k_neptune.jpg', sun: '2k_sun.jpg',
};

async function download(url, name) {
  const file = new URL(`.asset-cache/${name}`, root);
  try { return await readFile(file); } catch { /* cold cache */ }
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(file, buffer);
  return buffer;
}

// Orthographic projection of the credited equirectangular maps into static 2D sprites.
// This is asset preparation only; no 3D camera or runtime 3D rendering is used.
for (const [id, filename] of Object.entries(maps)) {
  const input = await download(`https://www.solarsystemscope.com/textures/download/${filename}`, filename);
  const { data, info } = await sharp(input).resize(1024, 512).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const size = 256;
  const output = Buffer.alloc(size * size * 4);
  const longitude = id === 'earth' ? 0.1 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + 0.5 - size / 2) / (size / 2);
    const ny = (y + 0.5 - size / 2) / (size / 2);
    const r2 = nx * nx + ny * ny;
    if (r2 >= 1) continue;
    const z = Math.sqrt(1 - r2);
    const u = ((0.5 + Math.atan2(nx, z) / (2 * Math.PI) + longitude) % 1 + 1) % 1;
    const v = 0.5 + Math.asin(ny) / Math.PI;
    const sx = Math.min(info.width - 1, Math.floor(u * info.width));
    const sy = Math.min(info.height - 1, Math.floor(v * info.height));
    const source = (sy * info.width + sx) * info.channels;
    const dest = (y * size + x) * 4;
    const shade = id === 'sun' ? 1 : 0.28 + 0.72 * Math.max(0, -nx * 0.35 - ny * 0.3 + z * 0.88);
    for (let c = 0; c < 3; c++) output[dest + c] = Math.round(data[source + c] * shade);
    output[dest + 3] = Math.round(Math.min(1, (1 - Math.sqrt(r2)) * size) * 255);
  }
  await sharp(output, { raw: { width: size, height: size, channels: 4 } }).webp({ quality: 90 }).toFile(fileURLToPath(new URL(`public/textures/${id}.webp`, root)));
  console.log(`Prepared ${id}`);
}

// Official New Horizons true-color portrait, supplied separately from SSS maps.
const plutoURL = 'https://assets.science.nasa.gov/content/dam/science/psd/solar/bosf/images/1-1-pluto-400x400-1.jpg';
const pluto = await download(plutoURL, 'pluto.jpg');
await sharp(pluto).trim({ background: '#000000', threshold: 15 }).resize(256, 256, { fit: 'cover' })
  .composite([{ input: Buffer.from('<svg width="256" height="256"><circle cx="128" cy="128" r="128" fill="white"/></svg>'), blend: 'dest-in' }])
  .webp({ quality: 90 }).toFile(fileURLToPath(new URL('public/textures/pluto.webp', root)));
console.log('Prepared pluto');
