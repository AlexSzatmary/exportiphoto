import chunk from "lodash/chunk.js";
import path from "path";
import fs from "fs";
import { execSync } from 'child_process'

export default async function handleExport({
  dir,
  image
}) {
  let outPath = path.join(dir, path.basename(image.path))
  if (fs.existsSync(outPath)) {
    outPath.replace(outPath.extname(), `-${image.id}${outPath.extname()}`)
  }
  const isPng = (/.png/gi).match(outPath.path)
  if (isPng) {
    console.log('TODO')
  } else {
    fs.renameSync(image.path, outPath)
  }
  execSync('exiftool -overwrite_original -keywords=')
  for (keyword of image.keyword) {
    execSync(`exiftool -overwrite_original -keywords+="${keyword}"`)
  }
}
