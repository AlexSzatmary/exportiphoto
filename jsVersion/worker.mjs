import chunk from "lodash/chunk.js";
import path from "path";
import fs from "fs";

export default async function handleExport({
  folderName,
  libraryPath,
  archivePath,
  images,
}) {
  const chunks = chunk(images, 30);
  for (let c of chunks) {
    let _promises = [];
    for (let i of c) {
      let modified = false;
      if (i.OriginalPath) {
        modified = true;
        const relativePath = i.OriginalPath.substring(archivePath.length);
        const inPath = path.normalize(path.join(libraryPath, relativePath));
        const outPath = path.normalize(
          path.join(
            folderName,
            i.Caption.replace(new RegExp("/", "gi"), "-") +
              path.extname(relativePath)
          )
        );
        if (fs.existsSync(inPath)) {
          const stats = fs.statSync(inPath);
          _promises.push(fs.promises.copyFile(inPath, outPath, fs.constants.COPYFILE_FICLONE));
          _promises.push(fs.utimes(outPath, stats.atime, stats.mtime))
        }
      }
      const relativePath = i.ImagePath.substring(archivePath.length);
      const inPath = path.normalize(path.join(libraryPath, relativePath));
      const outPath = path.normalize(
        path.join(
          folderName,
          (modified ? "_modified_" : "") +
          i.Caption.replace(new RegExp("/", "gi"), "-") +
            path.extname(relativePath)
        )
      );
      if (fs.existsSync(inPath)) {
        _promises.push(fs.promises.copyFile(inPath, outPath, fs.constants.COPYFILE_FICLONE));
      }
    }
    if (_promises.length) {
        try {
            await Promise.all(_promises);
        } catch (e) {
            console.error(e)
        }
      _promises = [];
    }
  }
}
