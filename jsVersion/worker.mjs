import path from "path";
import fs, { stat } from "fs";
import { execSync } from "child_process";
import sharp from "sharp";

const PNG_REGEX = new RegExp(".png", "gi");

function applyKeywords(path, keywords) {
  const keywordStr = keywords.join(",");
  execSync(
    `exiftool -overwrite_original -keywords="${keywordStr}" -sep "," "${path}"`
  );
}

function getAlternatePaths(dir, image) {
  const newP = getPath(dir, image)
  const old = path.normalize(
    path.join(
      dir,
      path.basename(image.filename) +
      path.extname(image.path).toLowerCase()
    )
  );
  const old_id_2 = path.normalize(
    path.join(
      dir,
      path.basename(image.filename) +
      `${image.id}` +
      path.extname(image.path).toLowerCase()
    )
  );
  const old_id = path.normalize(
    path.join(
      dir,
      path.basename(image.filename) +
      `-${image.id}` +
      path.extname(image.path).toLowerCase()
    )
  );
  const old_path = path.normalize(
    path.join(dir, path.basename(image.path), path.extname(image.path))
  );
  const old_path_und = path.normalize(
    path.join(
      dir,
      path.basename(image.path) +
      "-undefined" +
      path.extname(image.path)
    )
  );
  let res = [newP, old, old_id, old_id_2, old_path, old_path_und]
  res = [ ...res, ...res.map(e => e.replace(PNG_REGEX, '.jpg')) ]
  return res
}

function getPath(dir, image) {
  let fname = path
    .basename(image.filename)
    .substring(0, image.filename.length - path.extname(image.filename).length);
  const ext = path.extname(image.path).toLowerCase();
  let res = path.normalize(path.join(dir, fname + ext));
  if (fs.existsSync(res)) {
    res = res.replace(ext, `${image.id}${ext}`);
  }
  return res;
}

function handleFileMigration(inpath, outpath) {
  let res = outpath;
  const stats = fs.statSync(inpath);
  if (PNG_REGEX.test(inpath)) {
    res = outpath.replace(PNG_REGEX, ".jpg");
    sharp(inpath).toFormat("jpg", { palette: true }).toFile(res);
  } else {
    fs.renameSync(inpath, outpath);
  }
  fs.utimesSync(res, stats.atime, stats.mtime);
  return res;
}

function handleSource(dir, image) {
  const output = getPath(dir, image);
  if (fs.existsSync(image.path)) {
    return handleFileMigration(image.path, output);
  }
  const alternatePaths = getAlternatePaths(dir, image);
  const _oldPath = alternatePaths.find((ap) => fs.existsSync(ap));
  if (_oldPath) {
    return handleFileMigration(_oldPath, output);
  }
  console.log(`tried ${JSON.stringify(alternatePaths, null, 2)}`)
  return null;
}

export default async function handleExport({ dir, image }) {
  try {
    const output = handleSource(dir, image);
    if (output) {
      applyKeywords(output, image.keywords);
      console.log(`done for ${output}`);
    } else {
      console.error(JSON.stringify(image, null, 2));
    }
  } catch (e) {
    console.error(e)
    console.error(JSON.stringify(image, null, 2));
  }
}
