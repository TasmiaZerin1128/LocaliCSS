const RBush = require("rbush");
const settings = require("../settings");
const Failure = require("./Failure");
const Rectangle = require("./Rectangle");
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


        let collision = this.calculateOverlap(siblingRect, nodeRect);
    
        if (file !== undefined) {
            let classification = result ? 'TP' : 'FP';
            let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + range.toString() + ' Viewport:' + viewport + ' Classification: ' + classification;
            utils.printToFile(file, text);
            text = '|  |--[ Overlap-X: ' + collision.xToClear + ' Overlap-Y: ' + collision.yToClear + ' ]';
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

    async isObservable(driver, viewport, file, snapshotDirectory, range) {
        let xpaths = this.getXPaths();
        if (xpaths[0] === xpaths[1]) {
            console.log("Something went wrong, program went to compare the same element to self");
            return;
        } 
        console.log(driver.currentViewport);
        let node = await driver.getElementBySelector(this.node.getSelector());
        let sibling = await driver.getElementBySelector(this.parent.getSelector());
        let nodeRect = new Rectangle(await driver.getRectangle(node));
        let siblingRect = new Rectangle(await driver.getRectangle(sibling));

        let opacityNode = await driver.getOpacity(node);
        
        let opacitySibling = await driver.getOpacity(sibling);

        driver.scroll(node);
        // this.firstImageScrollOffsetX = await driver.getPageScrollWidth();
        // this.firstImageScrollOffsetY = await driver.getPageScrollHeight();

        console.log("Child xpath: " + this.node.xpath + " Parent xpath: " + this.parent.xpath + "\n");

        await driver.setViewport(viewport, settings.testingHeight);

        await driver.setOpacity(node, 0);
        await driver.setOpacity(sibling, 0);
        console.log("Opacity of node: " + opacityNode);
        let imagePath = viewport + '-imgNoElemets';
        await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        console.log("Took image for no elements!!!!!!!!!!");

        await driver.setOpacity(sibling, opacitySibling);
        await driver.page.waitForTimeout(100);
        console.log("Opacity of node: " + opacityNode);
        imagePath = viewport + '-imgBack';
        await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        console.log("Took an image of back!!!!!!!!!!");

        await driver.setOpacity(node, opacityNode);
        await driver.page.waitForTimeout(100);
        console.log("Opacity of node: " + opacityNode);
        imagePath = viewport + '-imgFront';
        await this.screenshotViewportforVerification(driver, viewport, imagePath, snapshotDirectory, true);
        console.log("Took an image of front!!!!!!!!!!");
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
}

module.exports = CollisionFailure;