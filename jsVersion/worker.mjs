import path from "path";
import fs from "fs";
import { execSync } from 'child_process'
import sharp from 'sharp'

const PNG_REGEX = new RegExp('.png', 'gi')
export default async function handleExport({
  dir,
  image
}) {
  let outPath = path.normalize(path.join(dir, path.basename(image.path)))
  const isPng = PNG_REGEX.test(outPath)
  if (isPng) {
    outPath = outPath.replace(/\.png/g, '.jpg')
  }
  if (fs.existsSync(image.path)) {
    if (fs.existsSync(outPath)) {
      outPath = path.normalize(outPath.replace(outPath.extname(), `-${image.id}${outPath.extname()}`))
    }
    if (isPng) {
      sharp(image.path).toFormat('jpg', { palette: true }).toFile(outPath)
    } else {
      fs.renameSync(image.path, outPath)
    }
  }
  execSync(`exiftool -overwrite_original -keywords= ${outPath}`)
  for (const keyword of image.keywords) {
    execSync(`exiftool -overwrite_original -keywords+="${keyword} ${outPath}"`)
  }
  console.log(`done for ${outPath}`)
}
