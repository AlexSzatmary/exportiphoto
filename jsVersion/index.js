import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import plist from "plist";
import fs from "fs";
import path from "path";
import groupBy from "lodash/groupBy.js";
import chunk from "lodash/chunk.js";
import escape from "escape-string-regexp";

const argv = yargs(hideBin(process.argv)).argv;

const intTypes = ["AlbumId", "Parent"];
class IPhotoExporter {
  _getXML() {
    const XMLPath = path.join(this.library, "AlbumData.xml");
    try {
      const xmlString = fs.readFileSync(XMLPath).toString();
      return plist.parse(xmlString);
    } catch (e) {
      console.error(e);
    }
  }
  async handleExport(folderName, album) {
    const images = album.KeyList.map((k) => this.images[k]);
    const libraryOriginalPath = this.xml["Archive Path"];
    const chunks = chunk(images, 30);
    try {
      for (let c of chunks) {
        let _promises = [];
        for (let i of c) {
          let modified = false;
          if (i.OriginalPath) {
            modified = true;
            const relativePath = i.OriginalPath.substring(
              libraryOriginalPath.length
            );
            const inPath = path.join(this.library, relativePath);
            const outPath = path.normalize(
              path.join(folderName, i.Caption + path.extname(relativePath))
            );
            _promises.push(fs.promises.copyFile(inPath, outPath));
          }
          const relativePath = i.ImagePath.substring(
            libraryOriginalPath.length
          );
          const inPath = path.join(this.library, relativePath);
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
        this.count += _promises.length;
        console.log(`${this.count}/${this.total} left`);
        _promises = [];
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
  async startExport(type = "Regular") {
    this.count = 0;
    const albums = this.albums.filter((f) => f["Album Type"] === type);
    this.total = albums.reduce((r, i) => r + i.PhotoCount, 0);
    for (let a of albums) {
      try {
        console.log(`starting ${a.AlbumName}`);
        const folderName = path.join(
          this.output,
          a.AlbumName.replace(new RegExp("/", "gi"), "-")
        );
        if (!fs.existsSync(folderName)) {
          fs.mkdirSync(folderName);
        }
        await this.handleExport(folderName, a);
      } catch (e) {
        console.error(`error on ${JSON.stringify(a, null, 2)}`);
        console.error(e);
      }
      console.log(`finishing ${a.AlbumName}`);
    }
  }
  constructor({ path, out }) {
    this.library = path;
    this.output = out;
    if (!fs.existsSync(this.output)) {
      fs.mkdirSync(this.output);
    }
    this.xml = this._getXML();
    this.albums = this.xml["List of Albums"];
    this.images = this.xml["Master Image List"];
  }
}

async function main() {
  console.log("initializing");
  const exporter = new IPhotoExporter({ path: argv.path, out: argv.out });
  console.log("initializing done");
  await exporter.startExport(argv.type);
}

await main();
