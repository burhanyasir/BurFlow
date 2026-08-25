#!/usr/bin/env node
// Generate simple PNG icons for the BurFlow Lead Generator Chrome extension.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const cx = x / width;
      const cy = y / height;
      if (isInLetterB(cx, cy)) {
        rawData.push(255, 255, 255);
      } else {
        rawData.push(r, g, b);
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function isInLetterB(x, y) {
  const left = 0.3, right = 0.7;
  const top = 0.15, bottom = 0.85;
  const mid = 0.5;

  if (x < left || x > right || y < top || y > bottom) return false;
  if (x >= left && x <= left + 0.12) return true;
  if (y >= top && y <= top + 0.12 && x >= left && x <= right - 0.1) return true;
  if (y >= mid - 0.06 && y <= mid + 0.06 && x >= left && x <= right - 0.1) return true;
  if (y >= bottom - 0.12 && y <= bottom && x >= left && x <= right - 0.1) return true;
  if (x >= right - 0.18 && y >= top + 0.06 && y <= mid - 0.06) return true;
  if (x >= right - 0.18 && y >= mid + 0.06 && y <= bottom - 0.12) return true;
  return false;
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let t = i;
    for (let j = 0; j < 8; j++) t = (t & 1) ? (0xEDB88320 ^ (t >>> 1)) : (t >>> 1);
    table[i] = t;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = createSolidPNG(size, size, 0, 98, 72);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`✓ icon${size}.png (${png.length} bytes)`);
});
