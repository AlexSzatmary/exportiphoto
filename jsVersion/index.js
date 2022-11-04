import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import plist from "plist";
import fs from "fs";
import path from "path";
import uniqBy from "lodash/uniqBy.js";
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
  async startExport() {
    let images = Object.keys(this.images).map((k) => ({
      ...this.images[k],
      id: k,
    }));
    images = images.map((i) => {
      let keywords = this.photosMetadata[i.id];
      if (keywords) {
        keywords.push("old-iphoto");
        delete this.photosMetadata[i.id];
      } else {
        keywords = this.noMatchKeywords;
      }
      return {
        filename: i.Caption.trim().toLowerCase(),
        path: (i.OriginalPath || i.ImagePath).replace(
          "/Users/Laurent/Pictures/iPhoto Library.photolibrary",
          this.library
        ),
        keywords,
      };
    });
    let count = 0;
    let total = images.length;
    let promises = [];
    for (let i of images) {
      const promise = this.pool
        .run({
          dir: this.output,
          image: i,
        })
        .then(() => {
          this.count++;
          console.log(`${(this.count / this.total) * 100}%`);
        });
      promises.push(promise);
    }
    return Promise.all(promises);
  }
  getKeywords() {
    for (let a of this.albums) {
      const keyword = a.AlbumName.trim()
        .replace(/-/g, " ")
        .replace(/\s+/g, "-")
        .toLowerCase();
      this.keywordsList = [...this.keywordsList, keyword];
      for (let key of a.KeyList) {
        this.photosMetadata[key] = [
          ...(this.photosMetadata[key] || []),
          keyword,
        ];
      }
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
    this.albums = this.xml["List of Albums"].filter(
      (a) =>
        a["Album Type"] !== "Event" &&
        a["Album Type"] !== "Special Month" &&
        a["Album Type"] !== "99" &&
        a["Album Type"] !== "Flagged"
    );
    this.images = this.xml["Master Image List"];
    this.photosMetadata = {};
    this.noMatchKeywords = ["old-iphoto", "à-trier"];
    this.keywordsList = ["old-iphoto", "à-trier"];
    this.getKeywords();
    fs.writeFileSync(`${this.output}/KEYWORD_LIST.txt`, uniqBy(this.keywordsList).sort((a, b) => a.localeCompare(b)).join(',\n'))
  }
}

async function main() {
  console.log("initializing");
  const exporter = new IPhotoExporter({ fp: argv.path, out: argv.out });
  console.log("initializing done");
  await exporter.startExport();
}

await main();
