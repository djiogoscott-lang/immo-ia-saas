/**
 * Optimise les avatars PNG en WebP 256x256.
 *
 * Lit chaque PNG dans public/avatars/, le redimensionne en 256x256 (max,
 * conserve le ratio si non carre via 'cover'), et l'exporte en WebP qualite 85.
 * Le fichier WebP est ecrit a cote (charly.png -> charly.webp).
 *
 * Usage : npm run optimize:avatars
 *
 * Gain attendu : ~150x plus leger (5-7 Mo -> 20-40 Ko par avatar).
 * Les PNG d'origine ne sont PAS supprimes par ce script (cleanup manuel apres
 * verification visuelle).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const AVATARS_DIR = path.resolve(process.cwd(), 'public/avatars');
const TARGET_SIZE = 256; // px — couvre tailles d'affichage jusqu'a 128px en HiDPI 2x
const WEBP_QUALITY = 85; // bon compromis qualite/poids pour avatars

async function main() {
  console.log(`Optimisation avatars : ${AVATARS_DIR}`);
  console.log(`Target : ${TARGET_SIZE}x${TARGET_SIZE} WebP q=${WEBP_QUALITY}\n`);

  let entries: string[];
  try {
    entries = await fs.readdir(AVATARS_DIR);
  } catch (err) {
    console.error(`Dossier introuvable : ${AVATARS_DIR}`);
    process.exit(1);
  }

  const pngs = entries.filter((f) => f.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) {
    console.log('Aucun PNG a optimiser.');
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;

  for (const png of pngs) {
    const srcPath = path.join(AVATARS_DIR, png);
    const outPath = path.join(AVATARS_DIR, png.replace(/\.png$/i, '.webp'));

    const beforeStat = await fs.stat(srcPath);
    const beforeKo = Math.round(beforeStat.size / 1024);
    totalBefore += beforeStat.size;

    try {
      await sharp(srcPath)
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outPath);

      const afterStat = await fs.stat(outPath);
      const afterKo = Math.round(afterStat.size / 1024);
      totalAfter += afterStat.size;
      processed += 1;

      const ratio = (beforeStat.size / afterStat.size).toFixed(1);
      console.log(
        `  ${png.padEnd(20)} ${String(beforeKo).padStart(5)} Ko -> ${String(afterKo).padStart(4)} Ko (x${ratio} plus leger)`
      );
    } catch (err) {
      console.error(`  ${png} : ECHEC -`, err instanceof Error ? err.message : err);
    }
  }

  const totalBeforeMo = (totalBefore / 1024 / 1024).toFixed(1);
  const totalAfterKo = Math.round(totalAfter / 1024);
  const globalRatio = (totalBefore / totalAfter).toFixed(1);

  console.log(`\n${processed}/${pngs.length} avatars optimises.`);
  console.log(`Total : ${totalBeforeMo} Mo -> ${totalAfterKo} Ko (x${globalRatio} plus leger)\n`);
  console.log('Etapes suivantes :');
  console.log('  1. Mettre a jour lib/agents/registry.ts (remplacer .png par .webp)');
  console.log('  2. Tester visuellement sur /agents');
  console.log('  3. Supprimer les vieux PNG : rm public/avatars/*.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
