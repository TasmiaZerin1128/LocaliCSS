const settings = require("../settings");
const DOM = require("./DOM");
const path = require('path');
const driver = require("./Driver");
const Rectangle = require("./Rectangle");
const RepairStatistics = require("./RepairStatistics");
const utils = require("./utils");
const fs = require('fs');

class Failure {
    constructor(webpage, run) {
        this.webpage = webpage;
        this.run = run;
        this.ID = undefined;
        this.range = undefined;
        this.type = 'Unknown-Failure';
        this.checkRepaireLater = false;
        this.repairStats = new RepairStatistics();
        this.ID = utils.getNewFailureID();
        utils.incrementFailureCount();
        this.repairElementHandle = undefined; //Style Element used to inject
        this.repairCSS = undefined; //CSS code for repair
        this.repairCSSComments = undefined; //CSS comments for repair
        this.repairApproach = undefined; //indicated which approach was successfully applied.
        this.removeFailingRepair = true;
        this.repairCombinationResult = [];
        this.durationFailureClassify = undefined;
        this.durationFailureRepair = undefined;
        this.durationWiderRepair = undefined;
        this.durationNarrowerRepair = undefined;
        this.durationWiderConfirmRepair = undefined;
        this.durationNarrowerConfirmRepair = undefined;
    }

    setupHumanStudyData() {
        this.hsData = { //will carry anonymous data only.
            ID: this.ID,
            type: this.type,
            rangeMin: this.range.min,
            rangeMax: this.range.max,
            rectangles: []
        };
        if (this.outputDirectory === undefined)
            throw "\nError - " + this.type + " has no output directory - ID:" + this.ID + "\n";
        this.hsKey = {
            humanStudyDirectory: path.join(this.outputDirectory, 'human-study', 'screenshots'),
            ID: this.ID,
            type: this.type,
            rangeMin: this.range.min,
            rangeMax: this.range.max,
            repairName: [],
            anonymizedImageNames: [],
            viewports: [],
            randomIDsUsed: [],
            rectangles: [],
            scrollY: []
        }
    }

    getClippingCoordinates(rectangles, extra = 0, maxHeight = 8000) {
        let problemArea = new Rectangle();
        for (let rect of rectangles) {
            if (rect.isMissingValues()) {
                utils.log(this.ID + " " + this.type + " " + this.range.toString());
                utils.log("Warning: cannot use rectangle for cutting screenshot...");
                utils.log(rect.toString(true));
                continue;
            }
            if (rect.height > maxHeight) { //max element height to support.
                utils.log(this.ID + " " + this.type + " " + this.range.toString());
                utils.log("Warning: Human Study - rectangle height exceeds maximum height: " + maxHeight);
                utils.log(rect.toString(true));
                continue;
            }
            if (problemArea.minX === undefined || rect.minX < problemArea.minX)
                problemArea.minX = rect.minX;
            if (problemArea.maxX === undefined || rect.maxX > problemArea.maxX)
                problemArea.maxX = rect.maxX;
            if (problemArea.minY === undefined || Math.max(rect.minY - extra, 0) < problemArea.minY)
                problemArea.minY = Math.max(rect.minY - extra, 0);
            if (problemArea.maxY === undefined || (rect.maxY + extra) > problemArea.maxY)
                problemArea.maxY = (rect.maxY + extra);
        }
        if (problemArea.isMissingValues()) { //use first in the worst case
            utils.log(this.ID + " " + this.type + " " + this.range.toString());
            utils.log("Warning: Human Study - Had to use first rectangle for cutting.");
            let rect = rectangles[0];
            utils.log(rect.toString(true));
            problemArea.minX = rect.minX;
            problemArea.maxX = rect.maxX;
            problemArea.minY = Math.max(rect.minY - extra, 0);
            problemArea.maxY = (rect.maxY + extra);
        }
        problemArea.width = problemArea.maxX - problemArea.minX;
        problemArea.height = problemArea.maxY - problemArea.minY;
        return problemArea;
    }


    async clipScreenshot(rectangles, screenshot, driver, fullViewportWidthClipping, viewport, problemArea = undefined) {
        try {
            if (problemArea === undefined)
                problemArea = this.getClippingCoordinates(rectangles);
            if (problemArea.isMissingValues())
                throw "== Begin Problem Area ==\n" +
                "Missing size for cutting screenshot\n" +
                problemArea + "\n" +
                "== End  Problem  Area ==\n" +
                "==  Begin Rectangles  ==\n" +
                + rectangles + "\n" +
                "==   End  Rectangles  ==\n"
            screenshot = await driver.clipImage(screenshot, problemArea, fullViewportWidthClipping, viewport);
        } catch (passedInErrorMessage) {
            let newErrorMessage = this.ID + ' ' + this.type + ' ' + this.range.toString() + '\n';
            for (let rect of rectangles) {
                newErrorMessage += rect.toString(true) + '\n';
            }
            newErrorMessage += '\n' + passedInErrorMessage;
            throw newErrorMessage;
        }
        return screenshot;
    }

    saveScreenshot(file, screenshot, removeHeader = true) {
        if (removeHeader)
            screenshot = screenshot.split(',')[1];
        fs.writeFile(file, screenshot, 'base64', function (err) {
            if (err) {
                console.log('ERROR IN SAVING IMAGE');
                console.log(err);
            }
        });
    }

    // Get parent width or viewport width and height from wider viewport.
    async getDOMFrom(driver, viewport, pseudoElements = [], root = undefined, xpath = undefined) {
        if (viewport === undefined)
            viewport = this.range.getWider();
        if (driver.currentViewport !== viewport)
            await driver.setViewport(viewport, settings.testingHeight);
        let dom = new DOM(driver, viewport);
        await dom.captureDOM(true, true, pseudoElements, root, xpath);
        return dom;
    }
    
    getDOMStylesCSS(dom) {
        if (this.repairCSS === undefined)
            this.repairCSS = '';
        let traversalStackDOM = [];
        traversalStackDOM.push(dom.root);
        while (traversalStackDOM.length > 0) {
            let domNode = traversalStackDOM.shift();
            let css = this.getRepairCSSFromComputedStyle(domNode.getComputedStyle(), undefined, undefined, false);
            if (css !== '') {
                this.repairCSS +=
                    "   " + domNode.getSelector() + " {\n" +
                    css +
                    "   " + "}\n";
            }
            for (let child of domNode.children) {
                traversalStackDOM.push(child);
            }
        }
        return this.repairCSS;
    }

    getRepairCSSFromComputedStyle(computedStyle, oracleViewport, cushion = 1, scale = true) {
        let css = '';
        for (let property in computedStyle) {
            if (settings.skipCopyingCSSProperties.includes(property))
                continue;
            let widerValues = [];
            let partsWithPX = [];
            if (scale === true &&
                computedStyle[property].includes('px') &&
                !settings.NoScalingCSSProperties.includes(property)) { //Avoid scaling some properties
                let parts = computedStyle[property].split(" ");

                for (let part of parts) {
                    if (part.includes('px')) {
                        let hasComma = false;
                        if (part.includes(',')) {
                            hasComma = true
                            part = part.trim().replace(',', '');
                        }
                        let num = Number(part.trim().replace('px', ''));
                        if (num === undefined || Number.isNaN(num)) {
                            let message = "Error - PX to Number: " + num + "\n" +
                                "Original: " + part + "\n";
                            throw message;
                        }
                        widerValues.push(num);
                        partsWithPX.push(true);
                        if (hasComma) {
                            widerValues.push(',');
                            partsWithPX.push(false);
                        }
                    }
                    else {
                        widerValues.push(part.trim());
                        partsWithPX.push(false);
                    }
                }
            }
            if (widerValues.length > 0 && scale) {
                let values = '';
                for (let i = 0; i < widerValues.length; i++) {
                    let figure = widerValues[i];
                    let withPX = partsWithPX[i];
                    if (withPX === true) {
                        if (figure === 0) {
                            values += '0px ';
                        } else {
                            values += "calc((100vw/" + (oracleViewport + cushion) + ")*" + figure + ") ";
                        }
                    } else {
                        values += figure + ' ';
                    }

                }
                if (values !== '') {
                    css +=
                        "      " + property + ": " + values + "!important; \n";
                }
            }
            else {
                css +=
                    "      " + property + ": " + computedStyle[property] + " !important; \n";
            }
        }
        return css;
    }

    async setViewportHeightBeforeSnapshot(viewport) {
        if (settings.browserMode === utils.Mode.HEADLESS) {
            let css = undefined;
            if (this.repairElementHandle === undefined) {
                let htmlElement = await driver.getHTMLElement();
                let dom = await this.getDOMFrom(driver, viewport, [], htmlElement);
                css = this.getDOMStylesCSS(dom);
            }

            let pageHeight = await driver.getPageHeightUsingHTMLElement();
            pageHeight = Math.max(pageHeight, settings.testingHeight);
            await driver.setViewport(viewport, pageHeight);
            if (this.repairElementHandle === undefined) {
                this.snapshotCSSElementHandle = await driver.addRepair(css);
            } else {
                await driver.setViewport(viewport, settings.testingHeight);
            }
        }

    }

    async snapshotViewport(driver, viewport, directory, includeClassification = false, clip = true) {
        await this.setViewportHeightBeforeSnapshot(viewport);
        let fullPage = true;
        if (settings.browserMode === utils.Mode.HEADLESS)
            fullPage = false;
        let rectangles = [];
        let elements = [];
        let selectors = this.getSelectors();
        for (let i = 0; i < selectors.length; i++) {
            let currentSelector = selectors[i];
            let element = undefined;
            try {
                element = await driver.getElementBySelector(currentSelector);
                elements.push(element);
            } catch (err) {
                console.log('Error: ' + err);
                elements.push(undefined); 
            }
            if (element != undefined) {
                try {
                    let rectangle = new Rectangle(await driver.getRectangle(element));
                    rectangle.selector = currentSelector;
                    rectangles.push(rectangle);
                } catch (err) {
                    console.log('Error: ' + err);
                    rectangles.push(undefined);
                }
            } else {
                rectangles.push(undefined);
            }
            let screenshot = await driver.screenshot(undefined, fullPage);
            let removeHeader = false;
            if (settings.screenshotHighlights) {
                screenshot = await driver.highlight(rectangles, screenshot);
                removeHeader = true;
            }
            // if (!settings.screenshotFullpage) {
            //     screenshot = await this.clipScreenshot(rectangles, screenshot.split(',')[1], driver, true, viewport);
            // }
            let imageFileName = 'FID-' + this.ID + '-' + this.type.toLowerCase() + '-' + this.range.toString().trim() + '-capture-' + viewport;
            let classification = this.range.getClassificationOfViewport(viewport);
            if (includeClassification && classification !== '-')
                imageFileName += '-' + classification + '.png';
            else
                imageFileName += '.png';
            this.saveScreenshot(path.join(directory, imageFileName), screenshot, removeHeader);
            for (let element of elements) {
                if (element !== undefined)
                    element.dispose();
            }
            await this.resetViewportHeightAfterSnapshots(driver.currentViewport);
        }
    }

    async resetViewportHeightAfterSnapshots(viewport) {
        if (this.repairElementHandle === undefined && this.snapshotCSSElementHandle !== undefined) {
            await driver.removeRepair(this.snapshotCSSElementHandle);
            await this.snapshotCSSElementHandle.dispose();
        }
        if (settings.browserMode === utils.Mode.HEADLESS)
            await driver.setViewport(viewport, settings.testingHeight);
    }

    // Returns an object with pixels child protruding {left, right, top, bottom}.
    calculateProtrusion(parentRect, childRect) {
        let protruding =
        {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        }
        if (childRect.minX < parentRect.minX) {
            protruding.left = parentRect.minX - childRect.minX;
        }
        if (childRect.maxX > parentRect.maxX) {
            protruding.right = childRect.maxX - parentRect.maxX;
        }
        if (childRect.minY < parentRect.minY) {
            protruding.top = parentRect.minY - childRect.minY;
        }
        if (childRect.maxY > parentRect.maxY) {
            protruding.bottom = childRect.maxY - parentRect.maxY;
        }
        return protruding;
    }

   /* Returns an object with number of pixels overlapping {left, right, top, bottom}.
    * Zeros for no collision.
    */
    calculateOverlap(nodeRect, siblingRect) {
        let overlap =
        {
            //node to be pushed away on either the x-axis or the y-axis.
            nodeRectToBeCleared: undefined,
            otherNodeRect: undefined,
            xToClear: 0,
            yToClear: 0
        }
        let nodeRectToBeCleared = undefined;
        let otherNodeRect = undefined;
        let xToClear = 0;
        let yToClear = 0;
        if (nodeRect.minX < siblingRect.minX) {
            nodeRectToBeCleared = siblingRect;
            otherNodeRect = nodeRect;
        } else if (nodeRect.minX > siblingRect.minX) {
            nodeRectToBeCleared = nodeRect;
            otherNodeRect = siblingRect;
        } else if (nodeRect.minX === siblingRect.minX) {
            if (nodeRect.minY < siblingRect.minY) {
                nodeRectToBeCleared = siblingRect;
                otherNodeRect = nodeRect;
            } else if (nodeRect.minY > siblingRect.minY) {
                nodeRectToBeCleared = nodeRect;
                otherNodeRect = siblingRect;
            } else if (nodeRect.minY === siblingRect.minY) {
                if (nodeRect.maxX < siblingRect.maxX) {
                    nodeRectToBeCleared = siblingRect;
                    otherNodeRect = nodeRect;
                } else if (nodeRect.maxX > siblingRect.maxX) {
                    nodeRectToBeCleared = nodeRect;
                    otherNodeRect = siblingRect;
                } else if (nodeRect.maxX === siblingRect.maxX) {
                    if (nodeRect.maxY < siblingRect.maxY) {
                        nodeRectToBeCleared = siblingRect;
                        otherNodeRect = nodeRect;
                    } else if (nodeRect.maxY > siblingRect.maxY) {
                        nodeRectToBeCleared = nodeRect;
                        otherNodeRect = siblingRect;
                    } else if (nodeRect.maxY === siblingRect.maxY) {
                        /**
                         * If they are equal rectangles break the tie by xpath length.
                         */
                        let sortedByXpath = [nodeRect.xpath, siblingRect.xpath].sort();
                        if (sortedByXpath[0] === nodeRect.xpath) {
                            nodeRectToBeCleared = siblingRect;
                            otherNodeRect = nodeRect;
                        } else {
                            nodeRectToBeCleared = nodeRect;
                            otherNodeRect = siblingRect;
                        }

                    }
                }
            }
        }
        if (utils.areOverlapping(nodeRectToBeCleared, otherNodeRect)) {
            xToClear = otherNodeRect.maxX - nodeRectToBeCleared.minX + 1;
            yToClear = otherNodeRect.maxY - nodeRectToBeCleared.minY + 1;
        } else {
            xToClear = 0;
            yToClear = 0;
        }

        overlap.nodeRectToBeCleared = nodeRectToBeCleared;
        overlap.otherNodeRect = otherNodeRect;
        overlap.xToClear = xToClear;
        overlap.yToClear = yToClear;
        return overlap;
    }

    // DOM level verification of the reported failures
    async classify(driver, classificationFile, snapshotDirectory, bar) {
        this.durationFailureClassify = new Date();
        let range = this.range;

        await driver.setViewport(range.getNarrower(), settings.testingHeight);
        range.narrowerClassification = await this.isFailing(driver, range.getNarrower(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotNarrower === true)
            await this.snapshotViewport(driver, range.getNarrower(), snapshotDirectory, true);

        await driver.setViewport(range.getMinimum(), settings.testingHeight);

        range.minClassification = await this.isFailing(driver, range.getMinimum(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMin === true)
            await this.snapshotViewport(driver, range.getMinimum(), snapshotDirectory, true);
        // if (settings.humanStudy === true)
        //     await this.screenshotForHumanStudy('Failure');

        await driver.setViewport(range.getMiddle(), settings.testingHeight);
        range.midClassification = await this.isFailing(driver, range.getMiddle(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMid === true)
            await this.snapshotViewport(driver, range.getMiddle(), snapshotDirectory, true);

        await driver.setViewport(range.getMaximum(), settings.testingHeight);

        range.maxClassification = await this.isFailing(driver, range.getMaximum(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMax === true)
            await this.snapshotViewport(driver, range.getMaximum(), snapshotDirectory, true);

        await driver.setViewport(range.getWider(), settings.testingHeight);

        range.widerClassification = await this.isFailing(driver, range.getWider(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotWider === true)
            await this.snapshotViewport(driver, range.getWider(), snapshotDirectory, true);

        bar.tick();
        this.durationFailureClassify = new Date() - this.durationFailureClassify;
    }
}

module.exports = Failure;