import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import plist from "plist";
import fs from "fs";
import path from "path";
import groupBy from "lodash/groupBy.js";
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
    const libraryOriginalPath = this.xml["libraryName"];
    console.log(`starting ${album.AlbumName}`);
    try {
      for (let i of images) {
        let _promises = [];
        if (i.OriginalPath) {
          const relativePath = i.OriginalPath.substring(
            libraryOriginalPath.length
          );
          const inPath = path.join(this.library, relativePath);
          const outPath = path.join(
            folderName,
            i.Caption + "_original" + path.extname(relativePath)
          );
          _promises.push(fs.promises.copyFile(inPath, outPath));
        }
        const relativePath = i.ImagePath.substring(libraryOriginalPath.length);
        const inPath = path.join(this.library, relativePath);
        const outPath = path.join(
          folderName,
          i.Caption + path.extname(relativePath)
        );
        _promises.push(fs.promises.copyFile(inPath, outPath));
        await Promise.all(_promises);
        this.count += 1;
        console.log(`${this.count}/${this.total} left`);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    console.log(`finishing ${album.AlbumName}`);
  }
  async startExport() {
    for (let a of this.albums) {
      try {
        const folderName = path.join(
          this.output,
          a.AlbumName.replace(new RegExp("/", "gi"), "-")
        );
        if (!fs.existsSync(folderName)) {
          fs.mkdirSync(folderName);
        }
        if (a["Album Type"] === "Regular") {
          await this.handleExport(folderName, a);
        }
      } catch (e) {
        console.error(`error on ${JSON.stringify(a, null, 2)}`);
        console.error(e);
      }
    }
  }
  constructor({ path, out }) {
    this.library = path;
    this.output = out;
    if (!fs.existsSync(this.output)) {
      this.mkdirSync(this.output);
    }
    this.xml = this._getXML();
    this.albums = this.xml["List of Albums"];
    this.total = this.albums
      .filter((f) => f["Album Type"] === "Regular")
      .reduce((r, i) => r + i.PhotoCount, 0);
    this.count = 0;
    this.images = this.xml["Master Image List"];
    //console.log(JSON.stringify(this.images, null, 2));
  }
}

async function main() {
  console.log("initializing");
  const exporter = new IPhotoExporter({ path: argv.path, out: argv.out });
  console.log("initializing done");
  await exporter.startExport();
}

await main();
