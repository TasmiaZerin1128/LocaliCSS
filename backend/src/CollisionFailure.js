const RBush = require("rbush");
const settings = require("../settings");
const Failure = require("./Failure");
const Rectangle = require("./Rectangle");
const fs = require('fs').promises;
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const utils = require("./utils");

class CollisionFailure extends Failure {
    constructor(node, sibling, parent, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.sibling = sibling;
        this.parent = parent;
        this.range = range;
        this.type = utils.FailureType.COLLISION;
        this.outputDirectory = outputDirectory;
        this.collision = null;
        this.protruding = false;
        this.segregated = false;
        this.overlapping = false;
        this.targetImages = [];
        if (settings.humanStudy === true)
            this.setupHumanStudyData();
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

    // Return true if there is an overlap between two nodes
    async isFailing(driver, viewport, file, range) {
        try {
            let node = await driver.getElementBySelector(this.node.getSelector());
            let sibling = await driver.getElementBySelector(this.sibling.getSelector());

            let nodeRect = new Rectangle(await driver.getRectangle(node));
            let siblingRect = new Rectangle(await driver.getRectangle(sibling));
            if (nodeRect.visible === false || nodeRect.validSize === false || nodeRect.positiveCoordinates == false) {
                return false;
            }
            if (siblingRect.visible === false || siblingRect.validSize === false || siblingRect.positiveCoordinates == false) {
                return false;
            }

            let collisionRBush = new RBush();
            nodeRect.minX += settings.tolerance.collision;
            nodeRect.maxX -= settings.tolerance.collision;
            nodeRect.minY += settings.tolerance.collision;
            nodeRect.maxY -= settings.tolerance.collision;


            collisionRBush.insert(siblingRect);
            let overlappingRectangles = collisionRBush.search(nodeRect);
            let result = overlappingRectangles.length > 0;

            // store the collision portion
            this.collision = this.calculateOverlap(siblingRect, nodeRect);
        
            if (file !== undefined) {
                let classification = result ? 'TP' : 'FP';
                let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range.toString() + ' Viewport:' + viewport + ' Classification: ' + classification;
                utils.printToFile(file, text);
                text = '|  |--[ Overlap-X: ' + this.collision.xToClear + ' Overlap-Y: ' + this.collision.yToClear + ' ]';
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
        }
        catch (e) {
            console.log('Error in getting elements for collision failure: ' + e);
            return false;
        }
    }

    async findAreasOfConcern() {
        console.log("Collision overlaps: " + this.collision.xToClear + " " + this.collision.yToClear)
        if (this.collision.xToClear == 0 && this.collision.yToClear == 0) {
            console.log('False Positive case of Element Collision');
            return false;
        }
        return true;
    }

    // Return true if there is an observable overlap between two nodes
    async isObservable(driver, viewport, file, snapshotDirectory, range) {
        let xpaths = this.getXPaths();
        if (xpaths[0] === xpaths[1]) {
            console.log("Something went wrong, program went to compare the same element to self");
            return;
        } 
        try {
            let node = await driver.getElementBySelector(this.node.getSelector());
            let sibling = await driver.getElementBySelector(this.sibling.getSelector());
            let nodeRect = new Rectangle(await driver.getRectangle(node));
            let siblingRect = new Rectangle(await driver.getRectangle(sibling));

            this.collision = this.calculateOverlap(siblingRect, nodeRect);

            let aoc = await this.findAreasOfConcern();
            if(aoc) {
                await this.takeImages(node, sibling, nodeRect, siblingRect, driver, viewport, snapshotDirectory);
                let observable = await this.pixelCheck();
                this.printVerified(file, observable, range, viewport);
                if (observable) {
                    return true;
                } else {
                    return false;
                }
            }
            return false;
        }
        catch (e) {
            console.log('Error in getting elements for collision failure: ' + e);
            return false;
        }
    }

    async takeImages(node, sibling, nodeRect, siblingRect, driver, viewport, snapshotDirectory) {
        
        let frontElement;
        let backElement;

        if (this.collision.nodeRectToBeCleared == nodeRect) {
            // Node element is on top of sibling element
            frontElement = node;
            backElement = sibling;
        } else {
            // Sibling element is on top of node element
            frontElement = sibling;
            backElement = node;
        }

        let opacityFront = await driver.getOpacity(frontElement);
        
        let opacityBack = await driver.getOpacity(backElement);

        driver.scroll(frontElement);

        console.log("Child xpath: " + this.node.xpath + " Parent xpath: " + this.parent.xpath + "\n");

        await driver.setViewport(viewport, settings.testingHeight);

        //Take a screenshot with both elements hidden
        await driver.setOpacity(frontElement, 0);
        await driver.setOpacity(backElement, 0);
        console.log("Opacity of node: " + opacityFront);
        let imagePath = viewport + '-imgNoElemets';
        let screenshotNoElement = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotNoElement);
        console.log("Took image for no elements!!!!!!!!!!");

        // Take a screenshot with only the back element visible
        await driver.setOpacity(backElement, opacityBack);
        await driver.page.waitForTimeout(100);
        imagePath = viewport + '-imgBack';
        let screenshotBack = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotBack);
        console.log("Took an image of back!!!!!!!!!!");


        await driver.setOpacity(frontElement, opacityFront);
        await driver.page.waitForTimeout(100);
        imagePath = viewport + '-imgFront';
        let screenshotFront = await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        this.targetImages.push(snapshotDirectory + "/" + screenshotFront);
        console.log("Took an image of front!!!!!!!!!!");
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

    print(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Sibling: ' + this.sibling.xpath + ' ]';
        utils.printToFile(file, text);
    }
    printClassified(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toClassifiedString() + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Sibling: ' + this.sibling.xpath + ' ]';
        utils.printToFile(file, text);
    }
    printVerified(file, observable, range, viewport) {
        let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range.toString() + ' Viewport:' + viewport + ' Observable Issue: ' + observable;
        utils.printToFile(file, text);
        text = '|--[ Node: ' + this.node.xpath + ' ]';
        utils.printToFile(file, text);
        text = '|  |  |--[ Sibling: ' + this.sibling.xpath + ' ]';
        utils.printToFile(file, text);
    }
}

module.exports = CollisionFailure;