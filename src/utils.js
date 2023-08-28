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
}

module.exports = utils;