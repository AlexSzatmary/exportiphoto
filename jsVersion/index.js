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
  async handleExport(folderName, album) {}
 
  startExport() {
    this.albums.forEach((f) => {
      try {
        const folderName = path.join(
          this.output,
          `${f.AlbumName}`.replace(new RegExp("/", "gi"), "-")
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
  }
  constructor({ path, out }) {
    this.library = path;
    this.output = out;
    this.xml = this._getXML();
    this.albums = this.xml["List of Albums"];
    this.promises = [];
    this.startExport();
    //console.log(JSON.stringify(this.xml, null, 2))
  }
}

function main() {
  const exporter = new IPhotoExporter({ path: argv.path, out: argv.out });
}

main();
