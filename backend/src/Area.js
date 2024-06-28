const Rectangle = require("./Rectangle");

class Area {
    constructor(area, viewMaxWidth, viewMaxHeight) {
      this.viewMaxWidth = viewMaxWidth;
      this.viewMaxHeight = viewMaxHeight;
      this.targetAreas = [];
      this.area = area;
      this.targetAreas = this.fitToView(area);
    }
  
    checkSides() {
      for (let targetArea of this.targetAreas) {
        if (targetArea.checkSides()) {
          return true;
        }
      }
      return false;
    }
  
    fitToView(rec) {
      let results = [];
      let resultsW = [];
      let areaSize = rec.height * rec.width;
      if (rec.width > this.viewMaxWidth) {
        let portion = Math.floor(rec.width / this.viewMaxWidth);
        for (let i = 0; i < portion; i++) {
          resultsW.push(new TargetArea(new Rectangle({x: (rec.x + (this.viewMaxWidth * i)), y: rec.y, height: rec.height, width:this.viewMaxWidth})));
        }
        if ((portion * this.viewMaxWidth) < rec.width) {
          let widthLeftOver = rec.width - (portion * this.viewMaxWidth);
          resultsW.push(new TargetArea(new Rectangle({x: (rec.x + (this.viewMaxWidth * portion)), y: rec.y, height: rec.height, width: widthLeftOver})));
        }
      } else {
        resultsW.push(new TargetArea(rec));
      }
      if (rec.height > this.viewMaxHeight) {
        if (resultsW.length > 0) {
          for (let tA of resultsW) {
            let portion = Math.floor(rec.height / this.viewMaxHeight);
            for (let i = 0; i < portion; i++) {
              results.push(new TargetArea(new Rectangle({x:tA.area.x, y: (tA.area.y + (this.viewMaxHeight * i)), height: this.viewMaxHeight, width: tA.area.width})));
            }
            if ((portion * this.viewMaxHeight) < rec.height) {
              let heightLeftOver = rec.height - (portion * this.viewMaxHeight);
              results.push(new TargetArea(new Rectangle({x: tA.area.x, y:(tA.area.y + (this.viewMaxHeight * portion)), height: heightLeftOver, width: rec.width})));
            }
          }
        }
      } else {
        let newArea = 0;
        for (let tA of resultsW) {
          newArea += (tA.area.height * tA.area.width);
        }
        if (newArea !== areaSize) {
          console.error(`Rectangle slicing error: (Original Area, New Area) (${areaSize}, ${newArea})`);
          process.exit(5);
        }
        return resultsW;
      }
      let newArea = 0;
      for (let tA of results) {
        newArea += (tA.area.height * tA.area.width);
      }
      if (newArea !== areaSize) {
        console.error(`Rectangle slicing error: (Original Area, New Area) (${areaSize}, ${newArea})`);
        process.exit(5);
      }
      return results;
    }
  }

  module.exports = Area;