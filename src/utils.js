class utils {

    static failureID = 0;
    static failureCount = 0;
    
    static RepairStrategy = {
        BASIC: "basic",
        ORACLE_PARENT: "oracle-parent",
        SHRINK_ROW_SIBLINGS: "shrink-row-siblings",
        ANCESTOR_MAX_WIDTH_HEIGHT: "ancestor-max-width-height",
    };
    static RepairType = {
        maxViewportSize: 1,
        maxParent: 2,
        maxAncestors: 3,
        pushApart: 4,
        shrinkRowSiblings: 5,
        widerParentSize: 6,
        computedStyle: 7,
    };

    static RepairConfirmed = {
        DOM: "DOM",
        RLG: "RLG",
        DOMRLG: "DOM and RLG"
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

    static printToFile(file, text, lineBreak = true) {
        if (lineBreak)
            text = text + EOL;
        if (file !== undefined)
            fs.appendFileSync(file, text, function (err) {
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
}

module.exports = utils;