// Genereert eenvoudige PNG-app-iconen (brand-groen met een vork/mes-mark)
// zonder externe dependencies, met de ingebouwde zlib.
// Draai: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const BRAND = [16, 185, 129] // #10b981
const WHITE = [255, 255, 255]
const BG = [11, 17, 32] // #0b1120 (rand)

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// Simpele "vork" tekenen op een canvas van size x size
function drawPixel(x, y, size) {
  const r = size * 0.11
  // afgeronde hoeken achtergrond
  const inCorner = (cx, cy) => Math.hypot(x - cx, y - cy) > r
  if (x < r && y < r && inCorner(r, r)) return BG
  if (x > size - r && y < r && inCorner(size - r, r)) return BG
  if (x < r && y > size - r && inCorner(r, size - r)) return BG
  if (x > size - r && y > size - r && inCorner(size - r, size - r)) return BG

  const u = x / size
  const v = y / size
  // Vork: 3 tanden + steel, links van midden
  const forkX = 0.30
  const tandTop = 0.18, tandBot = 0.42
  const tandW = 0.028
  const tands = [forkX - 0.06, forkX, forkX + 0.06]
  if (v > tandTop && v < tandBot) {
    for (const t of tands) if (Math.abs(u - t) < tandW) return WHITE
  }
  // hals + steel vork
  if (v >= tandBot && v < 0.5 && Math.abs(u - forkX) < 0.045) return WHITE
  if (v >= 0.5 && v < 0.82 && Math.abs(u - forkX) < 0.028) return WHITE
  // Mes rechts
  const knifeX = 0.66
  if (v > 0.16 && v < 0.5) {
    const w = 0.03 * (1 - (v - 0.16) / 0.5) + 0.012
    if (Math.abs(u - knifeX) < w) return WHITE
  }
  if (v >= 0.5 && v < 0.82 && Math.abs(u - knifeX) < 0.028) return WHITE

  return BRAND
}

function makePNG(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter type
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawPixel(x, y, size)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), makePNG(size))
  console.log('geschreven:', name)
}
