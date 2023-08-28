const Failure = require('./Failure');
const utils = require('./utils');
 
 class ViewportFailure extends Failure {
    // Create a viewport protrusion failure.
    constructor(node, parent, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.parent = parent;
        this.range = range;
        this.type = utils.FailureType.VIEWPORT;
        this.outputDirectory = outputDirectory;
        // if (settings.humanStudy === true)
        //     this.setupHumanStudyData();
    }

    // Get xpaths of this failure
    getXPaths() {
        let xpaths = [];
        xpaths.push(this.node.xpath);
        xpaths.push(this.parent.xpath);
        return xpaths;
    }

    getSelectors() {
        let selectors = [];
        selectors.push(this.node.getSelector());
        selectors.push(this.parent.getSelector());
        return selectors;
    }

    print(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toString() + ' ]';
        utils.printToFile(file, text);
    }

    printClassified(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toClassifiedString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Parent: ' + this.parent.xpath + ' ]';
        utils.printToFile(file, text);
    }
 }

 module.exports = ViewportFailure;