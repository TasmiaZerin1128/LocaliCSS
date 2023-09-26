const { tolerance } = require('../settings');
const Failure = require('./Failure');
const Rectangle = require('./Rectangle');
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

    async isFailing(driver, viewport, file, range) {
        let child = await driver.getElementBySelector(this.node.getSelector());
        let parent = await driver.getElementBySelector(this.parent.getSelector());
        let childRect = new Rectangle(await driver.getRectangle(child));
        let parentRect = new Rectangle(await driver.getRectangle(parent));
        if (parentRect.visible === false || parentRect.validSize === false || parentRect.positiveCoordinates == false)
            return false;
        if (childRect.visible === false || childRect.validSize === false || childRect.positiveCoordinates == false)
            return false;
        let protruding = this.calculateProtrusion(parentRect, childRect);
        let tol = 0;
        if (tolerance.protrusion !== undefined && tolerance.protrusion > 0)
            tol = tolerance.protrusion;
        //Viewport Protrusion is assumed not to be able to protrude from the bottom and hence bottom protrusion is not checked.
        let result = (protruding.top > tol || protruding.right > tol || protruding.left > tol);
        if (file !== undefined) {
            let classification = result ? 'TP' : 'FP';
            let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range + ' Viewport:' + viewport + ' Classification: ' + classification;
            utils.printToFile(file, text);
            text = '|  |--[ Left-P: ' + protruding.left + ' Right-P: ' + protruding.right + ' Top-P: ' + protruding.top + ' Bottom-P: ' + protruding.bottom + ' ]';
            utils.printToFile(file, text);
            text = '|--[ Parent: ' + this.parent.xpath + ' ]';
            utils.printToFile(file, text);
            text = '|  |--[ minX: ' + parentRect.minX + ' maxX: ' + parentRect.maxX + ' minY: ' + parentRect.minY + ' maxY: ' + parentRect.maxY + ' width: ' + parentRect.width + ' height: ' + parentRect.height + ' ]';
            utils.printToFile(file, text);
            text = '|--[ Child: ' + this.node.xpath + ' ]';
            utils.printToFile(file, text);
            text = '|  |--[ minX: ' + childRect.minX + ' maxX: ' + childRect.maxX + ' minY: ' + childRect.minY + ' maxY: ' + childRect.maxY + ' width: ' + childRect.width + ' height: ' + childRect.height + ' ]';
            utils.printToFile(file, text);

        }
        return result;
    }
 }

 module.exports = ViewportFailure;