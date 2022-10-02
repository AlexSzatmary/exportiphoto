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
    const images = album.keyList.map(k => this.images[k])
    const libraryName = this.library.split('/').pop()
    const promises = images.map(i => {
        let _promises = []
        if (i.OriginalPath) {
            const relativePath = i.OriginalPath.split(libraryName)[1]
            const inPath = path.join(this.library, relativePath)
            const outPath = path.join(folderName, i.Caption + '_original', path.extname(relativePath))
            _promises.push(fs.copyFile(inPath, outPath))
        }
        const relativePath = i.ImagePath.split(libraryName)[1]
        const inPath = path.join(this.library, relativePath)
        const outPath = path.join(folderName, i.Caption, path.extname(relativePath))
        _promises.push(fs.copyFile(inPath, outPath))
        return Promise.all(_promises)
    })
    return Promise.all(promises)
  }
  async startExport() {
    this.albums.forEach((f) => {
      try {
        const folderName = path.join(
          this.output,
          f.AlbumName.replace(new RegExp("/", "gi"), "-")
        );
        if (!fs.existsSync(folderName)) {
          if (f["Album Type"] === "Regular") {
            this.promises.push(this.handleExport(folderName, f));
          }
          fs.mkdirSync(folderName);
        }
      } catch (e) {
        console.error(`error on ${JSON.stringify(f, null, 2)}`);
        console.error(e);
      }
    });
    return Promise.all(this.promises)
  }
  constructor({ path, out }) {
    this.library = path;
    this.output = out;
    this.xml = this._getXML();
    this.albums = this.xml["List of Albums"];
    this.count = this.albums.filter(f["Album Type"] === "Regular").reduce((r, i) => r + i.PhotoCount, 0)
    this.images = this.xml["Master Image List"];
    this.promises = [];
    this.startExport();
    //console.log(JSON.stringify(this.images, null, 2));
  }
}

function main() {
  const exporter = new IPhotoExporter({ path: argv.path, out: argv.out });
}

main();
