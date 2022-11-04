import path from "path";
import fs, { stat } from "fs";
import { execSync } from 'child_process'
import sharp from 'sharp'

const PNG_REGEX = new RegExp('.png', 'gi')
export default async function handleExport({
  dir,
  image
}) {
  let outPath = path.normalize(path.join(dir, path.basename(image.filename) + path.extname(image.path).toLowerCase()))
  let oldOutPath = path.normalize(path.join(dir, path.basename(image.path)))
  const isPng = PNG_REGEX.test(outPath)
  if (isPng) {
    outPath = outPath.replace(/\.png/g, '.jpg')
    oldOutPath = oldOutPath.replace(/\.png/g, '.jpg')
  }
  if (fs.existsSync(image.path)) {
    const stats = fs.statSync(image.path)
    if (fs.existsSync(outPath)) {
      outPath = path.normalize(outPath.replace(path.extname(outPath), `-${image.id}${path.extname(outPath)}`))
    }
    if (isPng) {
      sharp(image.path).toFormat('jpg', { palette: true }).toFile(outPath)
    } else {
      fs.renameSync(image.path, outPath)
    }
    fs.utimesSync(outPath, stats.atime, stats.mtime)
  }
  if (fs.existsSync(oldOutPath)) {
    const stats = fs.statSync(oldOutPath)
    fs.renameSync(oldOutPath, outPath)
    fs.utimesSync(outPath, stats.atime, stats.mtime)
  }
  execSync(`exiftool -overwrite_original -keywords= "${outPath}"`)
  for (const keyword of image.keywords) {
    execSync(`exiftool -overwrite_original -keywords+="${keyword}" "${outPath}"`)
  }
  console.log(`done for ${outPath}`)
}
