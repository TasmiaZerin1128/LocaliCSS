const Failure = require('./Failure');
const Rectangle = require('./Rectangle');
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

    async isFailing(driver, viewport, file) {
        try {
            const alignment = utils.alignment;

            let element = await driver.getElementBySelector(this.node.getSelector())
            let siblingElement = await driver.getElementBySelector(this.sibling.getSelector());

            let nodeRect = new Rectangle(await driver.getRectangle(element));
            let siblingRect = new Rectangle(await driver.getRectangle(siblingElement));

            let alignments = [];
            if (nodeRect.isToMyRight(siblingRect))
                alignments.push(alignment.RIGHT)
            if (nodeRect.isToMyLeft(siblingRect))
                alignments.push(alignment.LEFT)
            if (nodeRect.isAboveMe(siblingRect))
                alignments.push(alignment.ABOVE)
            if (nodeRect.isBelowMe(siblingRect))
                alignments.push(alignment.BELOW)
            if (nodeRect.isOverlapping(siblingRect))
                alignments.push(alignment.OVERLAP)
            alignments.sort();
            let equalToWider = true;
            if (this.setWider.length !== alignments.length) {
                equalToWider = false;
            } else {
                for (let i = 0; i < alignments.length; i++)
                    if (alignments[i] !== this.setWider[i]) {
                        equalToWider = false;
                        break;
                    }
            }
            let equalToNarrower = true;
            if (this.setNarrower.length !== alignments.length) {
                equalToNarrower = false;
            } else {
                for (let i = 0; i < alignments.length; i++)
                    if (alignments[i] !== this.setNarrower[i]) {
                        equalToNarrower = false;
                        break;
                    }
            }

            let result = (!equalToWider && !equalToNarrower);
            if (file !== undefined) {
                let classification = result ? 'TP' : 'FP';
                let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + this.range.toString() + ' Viewport:' + viewport + ' Classification: ' + classification;
                utils.printToFile(file, text);
                text = '|  |--[ Current Alignments: ' + alignments + ' ]';
                utils.printToFile(file, text);
                text = '|  |--[ Set: ' + this.set + ' ]';
                utils.printToFile(file, text);
                text = '|  |--[ Set-Wider: ' + this.setWider + ' ]';
                utils.printToFile(file, text);
                text = '|  |--[ Set-Narrower: ' + this.setNarrower + ' ]';
                utils.printToFile(file, text);
                text = '|--[ Node: ' + this.node.xpath + ' ]';
                utils.printToFile(file, text);
                text = '|  |--[ minX: ' + nodeRect.minX + ' maxX: ' + nodeRect.maxX + ' minY: ' + nodeRect.minY + ' maxY: ' + nodeRect.maxY + ' ]';
                utils.printToFile(file, text);
                text = '|--[ Sibling: ' + this.sibling.xpath + ' ]';
                utils.printToFile(file, text);
                text = '|  |--[ minX: ' + siblingRect.minX + ' maxX: ' + siblingRect.maxX + ' minY: ' + siblingRect.minY + ' maxY: ' + siblingRect.maxY + ' ]';
                utils.printToFile(file, text);
            }
            return result;
        } catch (e) {
            console.log('Error in getting elements for small range failure: ' + e);
            return false;
        }
    }
}

module.exports = SmallRangeFailure;