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
  try {
    for (let c of chunks) {
      let _promises = [];
      for (let i of c) {
        let modified = false;
        if (i.OriginalPath) {
          modified = true;
          const relativePath = i.OriginalPath.substring(archivePath.length);
          const inPath = path.join(libraryPath, relativePath);
          const outPath = path.normalize(
            path.join(folderName, i.Caption + path.extname(relativePath))
          );
          _promises.push(fs.promises.copyFile(inPath, outPath));
        }
        const relativePath = i.ImagePath.substring(archivePath.length);
        const inPath = path.join(libraryPath, relativePath);
        const outPath = path.normalize(
          path.join(
            folderName,
            i.Caption +
              (modified ? "_modified" : "") +
              path.extname(relativePath)
          )
        );
        _promises.push(fs.promises.copyFile(inPath, outPath));
      }
      await Promise.all(_promises);
      _promises = [];
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}
