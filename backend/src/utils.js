const { EOL } = require('os');
const fs = require('fs');
const path = require('path');

class utils {

    static testOutputPath = '';
    static testOutputCSS = '';
    static testOutputSnapshot = '';

    static failureID = 0;
    static failureCount = 0;

    static svg = {
        prefix: '[name()=\'',
        postfix: '\']'
    };

    static alignment = {
        RIGHT: "Right",
        LEFT: "Left",
        ABOVE: "Above",
        BELOW: "Below",
        OVERLAP: "Overlap"
    };
    static highlightColors = ['red', 'yellow'];
    static Mode = {
        FULLSCREEN: "Fullscreen",
        MAXIMIZED: "Maximized",
        HEADLESS: "Headless"
    };
    static FailureType = {
        VIEWPORT: 'Viewport-Protrusion',
        PROTRUSION: 'Element-Protrusion',
        COLLISION: 'Element-Collision',
        SMALLRANGE: 'Small-Range',
        WRAPPING: 'Wrapping'
    };

    static getNewFailureID() {
        this.failureID++;
        return this.failureID;
    }
    static resetFailureID() {
        this.failureID = 0;
    }
    static incrementFailureCount() {
        this.failureCount++;
    }
    static resetFailureCount() {
        this.failureCount = 0;
    }

    static getDateTime() {
        const date = new Date();
        const year = date.getFullYear();
        let month = date.getMonth() + 1; // months are zero indexed
        let day = date.getDate();
      
        let hour = date.getHours();
        let min = date.getMinutes();
        let sec = date.getSeconds();
      
        day = (day < 10 ? '0' : '') + day;
        month = (month < 10 ? '0' : '') + month;
      
        hour = (hour < 10 ? '0' : '') + hour;
        min = (min < 10 ? '0' : '') + min;
        sec = (sec < 10 ? '0' : '') + sec;
      
        const dateTime = `${year}-${month}-${day}-${hour}-${min}-${sec}`;
      
        return dateTime;
      }

    static printToFile(file, text, lineBreak = true) {
        if (lineBreak)
            text = text + EOL;
        if (file !== undefined)
            fs.appendFileSync(file, text, function (err) {
                if (err) throw err;
            });
    }

    static log(text, lineBreak = true) {
        if (lineBreak)
            text = text + EOL;
        if (this.logFile !== undefined)
            fs.appendFileSync(this.logFile, text, function (err) {
                if (err) throw err;
            });
    }

    static setDifference(allInSet, notInSet) { //TODO: test.
        let difference = [];
        for (let e of allInSet)
            if (!notInSet.includes(e))
                difference.push(e);
        return difference;
    }

    static isObjectsXPathInArrayOfObjects(object, arrayOfObjects) {
        for (let obj of arrayOfObjects) {
            if (object.xpath === obj.xpath)
                return true;
        }
        return false;
    }

    static areOverlapping(rectangle1, rectangle2) {
        //check if one is on right of the other
        if (rectangle1.minX > rectangle2.maxX || rectangle2.minX > rectangle1.maxX)
            return false;
        //check if one is below the other
        if (rectangle1.minY > rectangle2.maxY || rectangle2.minY > rectangle1.maxY)
            return false;
        //they are overlapping
        return true;
    }

    static resolveAfterSeconds(seconds = 2) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve('done');
            }, seconds * 1000);
        });
    }

    static parseName(url) {
        if (url.includes("http://") || url.includes("https://")) {
            let name = url.replace(/^https?:\/\//, "");
            name = name.replace(/:/g, "-");
            name = name.replace('?', '');
            return name;
        } else {   // it is a file directory path
            let name = path.basename(url);
            return name;
        }
    }

    static addToZip(zip, folderPath, relativePath = '') {
        const files = fs.readdirSync(folderPath);
      
        files.forEach((file) => {
          const filePath = path.join(folderPath, file);
          const fileStats = fs.statSync(filePath);
          const fileRelativePath = path.join(relativePath, file);
      
          if (fileStats.isDirectory()) {
            this.addToZip(zip.folder(file), filePath, fileRelativePath);
          } else {
            const fileData = fs.readFileSync(filePath);
            zip.file(fileRelativePath, fileData);
          }
        });
    }
}

module.exports = utils;