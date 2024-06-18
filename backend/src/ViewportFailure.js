const { tolerance } = require('../settings');
const settings = require('../settings.js');
const Failure = require('./Failure')
const Rectangle = require('./Rectangle');
const utils = require('./utils');
const fs = require('fs').promises;
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
 
 class ViewportFailure extends Failure {
    // Create a viewport protrusion failure.
    constructor(node, parent, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.parent = parent;
        this.range = range;
        this.type = utils.FailureType.VIEWPORT;
        this.outputDirectory = outputDirectory;
        this.firstImageScrollOffsetX = 0;
        this.firstImageScrollOffsetY = 0;

        this.images = [];
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
        try {
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
                let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range.toString() + ' Viewport:' + viewport + ' Classification: ' + classification;
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
        catch (e) {
            console.log('Error in getting elements for viewport failure: ' + e);
            return false;
        }
    }

    async findAreasOfConcern() {
        if (this.protudingArea.top == 0 && this.protudingArea.bottom == 0 && this.protudingArea.left == 0 && this.protudingArea.right == 0) {
            console.log('False Positive case of Viewport Protrusion');
            return false;
        }
        return true;
    }

    // Return true if the child is visibly protruding from the viewport
    async isObservable(driver, viewport, file, snapshotDirectory, range) {
        let xpaths = this.getXPaths();
        if (xpaths[0] === xpaths[1]) {
            console.log("Something went wrong, program went to compare the same element to self");
            return;
        } 

        try {
            let child = await driver.getElementBySelector(this.node.getSelector());
            let parent = await driver.getElementBySelector(this.parent.getSelector());
            let childRect = new Rectangle(await driver.getRectangle(child));
            let parentRect = new Rectangle(await driver.getRectangle(parent));

            this.protudingArea = this.calculateProtrusion(parentRect, childRect);

            let aoc = await this.findAreasOfConcern();
            if(aoc) {
                await this.analysisContainedAOC(child, parent, driver, viewport, snapshotDirectory);
                let observable = await this.pixelCheck();
                if (observable) {
                    await this.analysisDetachedAOC(child, parent, childRect, parentRect, driver, viewport, snapshotDirectory);
                    let observableSeperated = await this.pixelCheckSeparated();
                    this.printVerified(file, observableSeperated, range, viewport);
                    if (observableSeperated) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
            return false;
        }
        catch (e) {
            console.log('Error in getting elements for viewport failure: ' + e);
            return false;
        }
    }

    async analysisContainedAOC(child, parent, driver, viewport, snapshotDirectory) {

       this.targetImages = [];
       this.targetSeparatedImages = [];

        let opacityChild = await driver.getOpacity(child);
        
        let opacityParent = await driver.getOpacity(parent);

        // this.firstImageScrollOffsetX = await driver.getPageScrollWidth();
        // this.firstImageScrollOffsetY = await driver.getPageScrollHeight();

        await driver.setViewport(viewport, settings.testingHeight);

        //Take a screenshot with both elements hidden
        await driver.setOpacity(child, 0);
        await driver.setOpacity(parent, 0);

        let imagePath = viewport + '-imgNoElemets';
        let screenshotNoElement = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotNoElement);

        // Take a screenshot with only the back element visible
        await driver.setOpacity(parent, opacityParent);
        await driver.page.waitForTimeout(100);
        imagePath = viewport + '-imgBack';
        let screenshotBack = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotBack);


        await driver.setOpacity(child, opacityChild);
        await driver.page.waitForTimeout(100);
        imagePath = viewport + '-imgFront';
        let screenshotFront = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotFront);
    }

    async analysisDetachedAOC(child, parent, childRect, parentRect, driver, viewport, snapshotDirectory) {
        this.protudingArea.x = parentRect.x + parentRect.width + this.protudingArea.left;
        this.protudingArea.y = childRect.y + this.protudingArea.top;
        this.protudingArea.width = this.protudingArea.right - this.protudingArea.left;
        this.protudingArea.height = childRect.height;
        this.protudingArea.xpath = this.node.xpath;

        let seperated = new Rectangle(this.protudingArea);

        let opacitySeperated = await driver.getOpacity(child);  // as the opacity of seperated area is the same as the child opacity
        let opacityParent = await driver.getOpacity(parent);

        await driver.setViewport(viewport, settings.testingHeight);

        //Take a screenshot with both elements hidden
        await driver.setOpacity(child, 0);
        await driver.setOpacity(parent, 0);

        let rects = [];
        rects.push(seperated);

        let imagePath = viewport + '-detached-imgNoElemets';
        let screenshotNoElement = await this.screenshotDetached(driver, viewport, rects, imagePath, snapshotDirectory);
        this.targetSeparatedImages.push(snapshotDirectory + "/" + screenshotNoElement);
        console.log("Took image for no elements again!");

        await driver.setOpacity(child, opacitySeperated);
        await driver.setOpacity(parent, opacityParent);
        await driver.page.waitForTimeout(100);
        imagePath = viewport + '-detached-imgFront';
        let screenshotFront = await this.screenshotDetached(driver, viewport, rects, imagePath, snapshotDirectory);
        this.targetSeparatedImages.push(snapshotDirectory + "/" + screenshotFront);
    }

    async pixelCheckSeparated() {
        const bufferNoElement = PNG.sync.read(await fs.readFile(this.targetSeparatedImages[0]));
        const bufferFront = PNG.sync.read(await fs.readFile(this.targetSeparatedImages[1]));
        const {width, height} = bufferNoElement;
        const diff = new PNG({width, height});

        let equalNoElementandFront = null;

        const numDiffPixelsFront = pixelmatch(bufferNoElement.data, bufferFront.data, diff.data, width, height, { threshold: 0.1 });

        if (numDiffPixelsFront===0) equalNoElementandFront = true;
    
        return !equalNoElementandFront;
    }

    async pixelCheck() {
        const bufferNoElement = PNG.sync.read(await fs.readFile(this.targetImages[0]));
        const bufferBack = PNG.sync.read(await fs.readFile(this.targetImages[1]));
        const bufferFront = PNG.sync.read(await fs.readFile(this.targetImages[2]));
        const {width, height} = bufferNoElement;
        const diff = new PNG({width, height});

        let equalNoElementandBack = null;
        let equalNoElementandFront = null;

        const numDiffPixelsBack = pixelmatch(bufferNoElement.data, bufferBack.data, diff.data, width, height, { threshold: 0.1 });
        const numDiffPixelsFront = pixelmatch(bufferNoElement.data, bufferFront.data, diff.data, width, height, { threshold: 0.1 });

        if (numDiffPixelsBack===0) equalNoElementandBack = true;
        if (numDiffPixelsFront===0) equalNoElementandFront = true;

    
        if (!equalNoElementandBack && !equalNoElementandFront) {
            return true;
        } else {
            return false;
        }
    }


    printVerified(file, observable, range, viewport) {
        let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range.toString() + ' Viewport:' + viewport + ' Observable Issue: ' + observable;
        utils.printToFile(file, text);
        text = '|--[ Child: ' + this.node.xpath + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Parent: ' + this.parent.xpath + ' ]';
        utils.printToFile(file, text);
    }
 }

 module.exports = ViewportFailure;