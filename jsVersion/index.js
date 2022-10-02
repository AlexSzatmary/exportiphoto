import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import plist from "plist";
import fs from "fs";
import path from "path";
import groupBy from "lodash/groupBy.js";
import chunk from "lodash/chunk.js";
import escape from "escape-string-regexp";
import { Piscina } from "piscina";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    console.log(`starting ${album.AlbumName}`);
    const images = album.KeyList.map((k) => this.images[k]);
    return this.pool
      .run({
        folderName,
        libraryPath: this.library,
        archivePath: this.xml["Archive Path"],
        images,
      })
      .then((res) => {
        this.count += images.length;
        console.log(`${(this.count / this.total) * 100}%`);
        console.log(`finishing ${album.AlbumName}`);
      });
  }
  async startExport(type = "Regular") {
    this.count = 0;
    const albums = this.albums.filter((f) => f["Album Type"] === type);
    this.total = albums.reduce((r, i) => r + i.PhotoCount, 0);
    let promises = [];
    const chunks = chunk(albums, 10);
    for (let c of chunks) {
      for (let a of c) {
        try {
          const folderName = path.join(
            this.output,
            a.AlbumName.replace(new RegExp("/", "gi"), "-")
          );
          if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName);
          }
          promises.push(this.handleExport(folderName, a));
        } catch (e) {
          console.error(`error on ${JSON.stringify(a, null, 2)}`);
          console.error(e);
        }
      }
      await Promise.all(promises)
    }
  }
  constructor({ fp, out }) {
    this.library = fp;
    this.output = out;
    this.pool = new Piscina({
      filename: path.join(__dirname, "worker.mjs"),
    });
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
  const exporter = new IPhotoExporter({ fp: argv.path, out: argv.out });
  console.log("initializing done");
  await exporter.startExport(argv.type);
}

await main();
