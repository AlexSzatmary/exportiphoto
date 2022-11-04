import path from "path";
import fs from "fs";
import { execSync } from 'child_process'
import sharp from 'sharp'

export default async function handleExport({
  dir,
  image
}) {
  let outPath = path.normalize(path.join(dir, path.basename(image.path)))
  if (fs.existsSync(outPath)) {
    outPath = path.normalize(outPath.replace(outPath.extname(), `-${image.id}${outPath.extname()}`))
  }
  const isPng = (/.png/gi).match(outPath)
  if (isPng) {
    sharp(image.path).toFormat('jpg', { palette: true }).toFile(outPath)
  } else {
    fs.renameSync(image.path, outPath)
  }
  execSync('exiftool -overwrite_original -keywords=')
  for (keyword of image.keyword) {
    execSync(`exiftool -overwrite_original -keywords+="${keyword}"`)
  }
  console.log(`done for ${outPath}`)
}
