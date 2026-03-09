/**
 * Download brand logos (PNG) and save to public/images/brands/
 * Tries Clearbit first; if unreachable (e.g. ENOTFOUND), uses Google favicon.
 * Run from frontend: node scripts/download-brand-logos.js
 * Or from backend: npm run download-brand-logos
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DOMAINS = [
  'bmw.com', 'hyundai.com', 'kia.com', 'tatamotors.com', 'mahindra.com', 'honda.com',
  'toyota.com', 'suzuki.com', 'marutisuzuki.com', 'ford.com', 'volkswagen.com',
  'skoda-auto.com', 'mg.co.uk', 'renault.com', 'nissan.com', 'jeep.com',
  'mercedes-benz.com', 'audi.com', 'volvo.com', 'jaguar.com', 'landrover.com',
  'porsche.com', 'lexus.com', 'mi.com', 'samsung.com', 'apple.com', 'oneplus.com',
  'oppo.com', 'vivo.com', 'realme.com', 'motorola.com', 'nokia.com', 'google.com',
  'huawei.com', 'sony.com', 'asus.com', 'lenovo.com', 'hp.com', 'dell.com',
  'acer.com', 'msi.com',
];

function domainToSlug(domain) {
  return domain.split('.')[0] || domain.replace(/\./g, '-');
}

function download(url, followRedirect = true) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : require('http');
    lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 308 && followRedirect && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return download(next, true).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** Minimal 1x1 transparent PNG so filter sidebar has a file to show */
function createPlaceholderPng() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'images', 'brands');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Downloading brand logos to', outDir, '\n');

  const sources = [
    { name: 'Clearbit', url: (d) => `https://logo.clearbit.com/${d}` },
    { name: 'Google', url: (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128` },
  ];

  for (const domain of DOMAINS) {
    const slug = domainToSlug(domain);
    const filePath = path.join(outDir, `${slug}.png`);
    let saved = false;
    for (const src of sources) {
      try {
        const buf = await download(src.url(domain));
        if (buf && buf.length > 0) {
          fs.writeFileSync(filePath, buf);
          console.log('✓', domain, '→', `${slug}.png`, `(${src.name})`);
          saved = true;
          break;
        }
      } catch (_) {}
    }
    if (!saved) {
      fs.writeFileSync(filePath, createPlaceholderPng());
      console.log('○', domain, '→', `${slug}.png`, '(placeholder – add real logo later)');
    }
  }

  // Verify: list file sizes so we can confirm images downloaded (real PNGs are typically > 200 bytes)
  const placeholderSize = createPlaceholderPng().length;
  let ok = 0;
  let placeholders = 0;
  for (const domain of DOMAINS) {
    const slug = domainToSlug(domain);
    const filePath = path.join(outDir, `${slug}.png`);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > placeholderSize + 100) {
        ok++;
      } else {
        placeholders++;
      }
    }
  }
  console.log('\nDone.');
  console.log(`Verification: ${ok} logos saved (real images), ${placeholders} placeholders.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
