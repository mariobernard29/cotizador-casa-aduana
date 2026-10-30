/**
 * Convierte el logotipo original (RECURSOS/*.avif) a PNG para la interfaz y el PDF.
 * No altera el diseño: solo cambia el formato y genera una versión ampliada.
 * Uso: npm run brand:logo
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const resources = path.join(root, "RECURSOS");
const source = fs.readdirSync(resources).find((f) => f.toLowerCase().endsWith(".avif"));
if (!source) throw new Error("No se encontró el logotipo .avif en RECURSOS/");

const input = path.join(resources, source);
const outDir = path.join(root, "public", "brand");
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const meta = await sharp(input).metadata();
  console.log(`Logotipo original: ${source} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);

  await sharp(input).png().toFile(path.join(outDir, "logo.png"));
  await sharp(input)
    .resize({ width: (meta.width ?? 128) * 4, kernel: "lanczos3" })
    .png()
    .toFile(path.join(outDir, "logo@4x.png"));
  await sharp(input)
    .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, "src", "app", "icon.png"));
  console.log("Generados: public/brand/logo.png, public/brand/logo@4x.png, src/app/icon.png");
}

main();
