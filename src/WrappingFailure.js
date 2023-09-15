const Failure = require("./Failure");

class WrappingFailure extends Failure {
    constructor(node, row, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.row = row;
        this.range = range;
        this.type = FailureType.WRAPPING;
        this.outputDirectory = outputDirectory;
        if (settings.humanStudy === true)
            this.setupHumanStudyData();
    }

    // Get xpaths of this failure
    getXPaths() {
        let xpaths = [];
        xpaths.push(this.node.xpath);
        for (let rowElement of this.row) {
            xpaths.push(rowElement.xpath);
        }
        return xpaths;
    }

    // Get selectors of this failure
    getSelectors() {
        let selectors = [];
        selectors.push(this.node.getSelector());
        for (let rowElement of this.row) {
            xpaths.push(rowElement.getSelector());
        }
        return xpaths;
    }
}