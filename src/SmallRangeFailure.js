const Failure = require('./Failure');
const utils = require('./utils');

class SmallRangeFailure extends Failure {
    constructor(node, sibling, range, set, setNarrower, setWider, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.sibling = sibling;
        this.range = range;
        this.type = utils.FailureType.SMALLRANGE;
        this.set = set.sort();
        this.setWider = setWider.sort();
        this.setNarrower = setNarrower.sort();
        this.outputDirectory = outputDirectory;
        // if (settings.humanStudy === true)
        //     this.setupHumanStudyData();
    }

    getXPaths() {
        let xpaths = [];
        xpaths.push(this.node.xpath);
        xpaths.push(this.sibling.xpath);
        return xpaths;
    }

    getSelectors() {
        let selectors = [];
        selectors.push(this.node.getSelector());
        selectors.push(this.sibling.getSelector());
        return selectors;
    }

    equals(otherFailure) {
        if (this.type !== otherFailure.type)
            return false;
        let equalNodes = (this.node.xpath === otherFailure.node.xpath && this.sibling.xpath === otherFailure.sibling.xpath) ||
            (this.sibling.xpath === otherFailure.node.xpath && this.node.xpath === otherFailure.sibling.xpath)
        return equalNodes;
    }

    printClassified(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toClassifiedString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Sibling: ' + this.sibling.xpath + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |  |--[ Alignments narrower: ' + this.setNarrower.toString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |  |--[ Alignments: ' + this.set.toString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |  |--[ Alignments wider: ' + this.setWider.toString() + ' ]';
        utils.printToFile(file, text);
    }
}

module.exports = SmallRangeFailure;