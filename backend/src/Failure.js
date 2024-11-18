const utils = require('./utils.js');
const { Range, Ranges } = require('./Range.js');
const path = require('path');
const Rectangle = require('./Rectangle.js');
const settings = require('../settings.js');
const FailureType = utils.FailureType;
const RBush = require('rbush');
const ProgressBar = require('progress');
const { EOL } = require('os');
const fs = require('fs');
const driver = require('./Driver.js');
const { sendMessage } = require('../socket-connect.js');
const sharp = require("sharp");

class Failure {
    constructor(webpage, run) {
        this.webpage = webpage;
        this.run = run;
        this.ID = undefined;
        this.range = undefined;
        this.type = 'Unknown-Failure-Type';
        this.ID = utils.getNewFailureID(); //unique to entire run and all webpages
        utils.incrementFailureCount(); //counts failures of the current web page.
        this.horizontalOrVertical = null;
        this.direction = null;
        this.durationFailureClassify = undefined;
        this.durationFailureVerify = undefined;
    }
    /**
     * Prepare data for human study related to this failure.
     */
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

    /**
     * Used if an RLF can have multiple ranges. Deprecated.
     */
    setID() {
        this.ID = utils.getNewFailureID(); //unique to entire run and all webpages
        utils.incrementFailureCount(); //counts failures of the current web page.
    }
    /**
     * Adds single range to the set of ranges. Deprecated
     * @param {Range} range The range to add.
     */
    addRange(range) {
        this.range.addRange(range);
    }
    /**
     * Adds a set of ranges to the set of ranges belonging to this failures. Deprecated
     * @param {Ranges} ranges The set of ranges to add to this set of ranges.
     */
    addRanges(ranges) {
        this.range.addRanges(ranges);
    }
    /**
     * Dom level verification of the reported failures.
     */
    async classify(driver, classificationFile, snapshotDirectory, bar, counter) {
        this.durationFailureClassify = new Date();
        let range = this.range;

        await driver.start();

        await driver.setViewport(range.getNarrower(), settings.testingHeight);
        range.narrowerClassification = await this.isFailing(driver, range.getNarrower(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotNarrower === true)
            await this.screenshotViewport(driver, range.getNarrower(), snapshotDirectory, true);

        await driver.setViewport(range.getMinimum(), settings.testingHeight);
        range.minClassification = await this.isFailing(driver, range.getMinimum(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMin === true)
            await this.screenshotViewport(driver, range.getMinimum(), snapshotDirectory, true);
        if (settings.humanStudy === true)
            await this.screenshotForHumanStudy('Failure');

        await driver.setViewport(range.getMiddle(), settings.testingHeight);
        range.midClassification = await this.isFailing(driver, range.getMiddle(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMid === true)
            await this.screenshotViewport(driver, range.getMiddle(), snapshotDirectory, true);

        await driver.setViewport(range.getMaximum(), settings.testingHeight);
        range.maxClassification = await this.isFailing(driver, range.getMaximum(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotMax === true)
            await this.screenshotViewport(driver, range.getMaximum(), snapshotDirectory, true);

        await driver.setViewport(range.getWider(), settings.testingHeight);
        range.widerClassification = await this.isFailing(driver, range.getWider(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotWider === true)
            await this.screenshotViewport(driver, range.getWider(), snapshotDirectory, true);

        await driver.close();

        bar.tick();
        sendMessage("Classify", {'counter': bar.curr, 'total': utils.failureCount});
        this.durationFailureClassify = new Date() - this.durationFailureClassify;
    }

    // Layer based verification of the reported failures.
    async verify(driver, verificationFile, snapshotDirectory, bar, counter) {
        const executeVerification = async (driver) => {
            let range = this.range;
    
            await driver.start();
    
            let minRange = range.getMinimum();
            let maxRange = range.getMaximum();
    
            await driver.setViewport(minRange, settings.testingHeight);
            range.minVerification = await this.isObservable(driver, minRange, verificationFile, snapshotDirectory, range) ? 'TP' : 'FP';
    
            await driver.setViewport(maxRange, settings.testingHeight);
            range.maxVerification = await this.isObservable(driver, maxRange, verificationFile, snapshotDirectory, range) ? 'TP' : 'FP';

            await driver.close();
        };
    
        try {
            this.durationFailureVerify = new Date();
            await executeVerification(driver);
            bar.tick();
            sendMessage("Verify", {'counter': bar.curr, 'total': utils.failureCount});
            this.durationFailureVerify = new Date() - this.durationFailureVerify;
        } catch (err) {
            if (err.name === 'TargetCloseError') {
                console.log('Session closed, restarting driver...');
                await driver.close();
                await driver.start();
                await executeVerification(driver);
            } else {
                console.log(err);
            }
        }
    }

    async getRectangles() {
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
                console.log(err);
                elements.push(undefined);
            }
            if (element != undefined) {
                try {
                    let rectangle = new Rectangle(await driver.getRectangle(element));
                    rectangle.selector = currentSelector;
                    rectangles.push(rectangle);
                } catch (err) {
                    console.log(err);
                    rectangles.push(undefined);
                }
            }
            else
                rectangles.push(undefined);
        }
        return rectangles;
    }

    wrappedArea(rectangles) {
        if (wrapperBelowAllElements(rectangles)) {
            wrapped = true;
            return new Area(rectangles[0], 0, 0);
        }
    }

    // Find Areas of Concern for the failure regions
    // async findAreasOfConcern() {
    //     let rectangles = this.getRectangles();
    //     if (this.type === FailureType.WRAPPING) {
    //         wrappedArea = this.wrappedArea(rectangles);
    //     }
    // }


    /**
     * Compares this failure to passed in failure. Returns true if both are the 
     * same type, the xpaths of two nodes involved are equal. Range is not considered.
     */
    isEqual(otherFailure) {
        return this.equals(otherFailure);
    }
    /**
     * Get parent width or viewport width and height from wider viewport.
     */
    async getParentWidthHeight(driver, viewport) {
        if (viewport === undefined)
            viewport = this.range.getWider();
        if (driver.currentViewport !== viewport)
            await driver.setViewport(viewport, settings.testingHeight);
        let parent = await driver.getElementBySelector(this.parent.getSelector());
        let parentRect = new Rectangle(await driver.getRectangle(parent));
        let oracle = {};
        oracle.width = Math.min(parentRect.width, this.range.getMinimum());
        oracle.height = parentRect.height;
        return oracle;
    }
    /**
     * Get parent width or viewport width and height from wider viewport.
     */
    async getDOMFrom(driver, viewport, pseudoElements = [], root = undefined, xpath = undefined) {
        if (viewport === undefined)
            viewport = this.range.getWider();
        if (driver.currentViewport !== viewport)
            await driver.setViewport(viewport, settings.testingHeight);
        let dom = new DOM(driver, viewport);
        await dom.captureDOM(true, true, pseudoElements, root, xpath);
        return dom;
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

    /**
     * Create media rule using range of failure. Including comments.
     * @param {string} css CSS to put in media rule.
     */
    makeRuleCSS(css, comments = true, min = this.range.getMinimum(), max = this.range.getMaximum()) {
        if (css === undefined)
            css = this.repairCSS;
        if (css === undefined || css === '')
            return undefined;

        let ruleCSS = '';
        if (comments === true)
            ruleCSS = this.createCSSComment() +
                '/*\n' + this.repairApproach + '\n' + "comparison-wider-classification: " + this.range.widerClassification + '\n*/\n';
        ruleCSS +=
            "@media only screen and (min-width: " + min + "px) and (max-width: " + max + "px){\n" +
            css +
            "}\n";
        return ruleCSS;
    }
    /**
     * Create the CSS comments for this failure.
     */
    createCSSComment() {
        this.repairCSSComments = "/*\n" +
            "   " + "ID: " + this.ID + " Type: " + this.type + "\n" +
            "   " + "Range: " + this.range.toString() + "\n" +
            "   " + "Node: " + this.node.xpath + "\n";

        if (this.type === FailureType.COLLISION || this.type === FailureType.SMALLRANGE) {
            this.repairCSSComments += "   " + "Sibling: " + this.sibling.xpath + "\n";
            if (this.type === FailureType.COLLISION)
                this.repairCSSComments += "   " + "Parent: " + this.parent.xpath + "\n";
            if (this.type === FailureType.SMALLRANGE) {
                this.repairCSSComments += "   " + "Set: " + this.set + "\n";
                this.repairCSSComments += "   " + "Set Wider: " + this.setWider + "\n";
                this.repairCSSComments += "   " + "Set Narrower: " + this.setNarrower + "\n";

            }

        }
        if (this.type === FailureType.VIEWPORT || this.type === FailureType.PROTRUSION)
            this.repairCSSComments += "   " + "Parent: " + this.parent.xpath + "\n";
        if (this.type === FailureType.WRAPPING)
            for (let rowElement of this.row)
                this.repairCSSComments += "   " + "Row Element: " + rowElement.xpath + "\n";
        this.repairCSSComments += "*/\n"
        return this.repairCSSComments;
    }
    /**
     * Using the transform property and scale function with the provided
     * scale value, CSS that targets BODY element is returned.
     */
    getTransformScaleCSS(scaleValue, selector = undefined) {
        let css = "";
        if (selector === undefined)
            css += "   " + "html:nth-of-type(1) {\n";
        else
            css += "   " + selector + " {\n";
        css +=
            "      " + "transform: scale(" + scaleValue + ") !important;\n" +
            "      " + "transform-origin: left top !important;\n" +

            "   " + "}\n";
        return css;
    }

    /**
     * Takes a screenshot of this failure.
     */
    async screenshotFailure(driver, directory, bar) {
        let viewports = [];
        if (this.type === FailureType.SMALLRANGE) {
            viewports = this.range.getMinNarrowerWiderOfRanges();
        } else {
            viewports = this.range.getMinWiderViewportsOfRange();
        }
        viewports.sort(function (a, b) { return b - a });
        for (let viewport of viewports) {
            await this.screenshotViewport(driver, viewport, directory, true);
        }
        bar.tick();
    }
    async fullPageScreenshot(captureViewport = driver.currentViewport, imagePath) {

        //page scroll width and scroll height
        let width = await driver.getPageScrollWidth();
        width = Math.max(width, captureViewport);

        let height = await driver.getPageScrollHeight();
        height = Math.max(height, settings.testingHeight);

        //Fix the all element properties if no repair is applied.
        if (this.repairElementHandle === undefined) {
            let htmlElement = await driver.getHTMLElement();
            let dom = await this.getDOMFrom(driver, captureViewport, [], htmlElement);
            let css = this.getDOMStylesAsCSS(dom);
            this.snapshotCSSElementHandle = await driver.addRepair(css);
        }



        if (settings.browserMode === utils.Mode.HEADLESS)
            await driver.setViewport(width, height);

        await driver.screenshot(imagePath, false, false);
        if (this.repairElementHandle === undefined && this.snapshotCSSElementHandle !== undefined) {
            await driver.removeRepair(this.snapshotCSSElementHandle);
            await this.snapshotCSSElementHandle.dispose();
        }
        if (settings.browserMode === utils.Mode.HEADLESS)
            await driver.setViewport(captureViewport, settings.testingHeight);
    }
    async setViewportHeightBeforeSnapshots(viewport = driver.currentViewport, ruleMin = undefined, ruleMax = undefined) {
        if (settings.browserMode === utils.Mode.HEADLESS) {
            let css = undefined
            if (this.repairElementHandle === undefined) {
                let htmlElement = await driver.getHTMLElement();
                let dom = await this.getDOMFrom(driver, viewport, [], htmlElement);
                css = this.getDOMStylesAsCSS(dom);
            }


            let pageHeight = await driver.getPageHeightUsingHTMLElement();
            if (settings.screenshotSpecial !== undefined && settings.screenshotSpecial.length > 0) {
                for (let name of settings.screenshotSpecial) {
                    if (this.webpage.toLocaleLowerCase().includes(name.toLocaleLowerCase())) {
                        pageHeight = await driver.getMaxElementHeight();
                    }
                }
            }
            pageHeight = Math.max(pageHeight, settings.testingHeight);
            await driver.setViewport(viewport, pageHeight);
            if (this.repairElementHandle === undefined)
                this.snapshotCSSElementHandle = await driver.addRepair(css);
        } else {
            await driver.setViewport(viewport, settings.testingHeight);
        }
    }
    async resetViewportHeightAfterSnapshots(viewport = driver.currentViewport) {
        if (this.repairElementHandle === undefined && this.snapshotCSSElementHandle !== undefined) {
            await driver.removeRepair(this.snapshotCSSElementHandle);
            await this.snapshotCSSElementHandle.dispose();
        }
        if (settings.browserMode === utils.Mode.HEADLESS)
            await driver.setViewport(viewport, settings.testingHeight);
    }

    /**
     * Takes a screenshot of at the given viewport.
     */
    async screenshotViewport(driver, viewport, directory, includeClassification = false, clip = false) {
        await this.setViewportHeightBeforeSnapshots(viewport);
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
                console.log(err);
                elements.push(undefined);
            }
            if (element != undefined) {
                try {
                    let rectangle = new Rectangle(await driver.getRectangle(element));
                    rectangle.selector = currentSelector;
                    rectangles.push(rectangle);
                } catch (err) {
                    console.log(err);
                    rectangles.push(undefined);
                }
            }
            else
                rectangles.push(undefined);
        }
        let screenshot = await driver.screenshot(undefined, fullPage);
        let removeHeader = false;
        if (settings.screenshotHighlights) {
            screenshot = await driver.highlight(rectangles, screenshot);
            removeHeader = true;
        }
        if (!settings.screenshotFullpage)
            screenshot = await this.clipScreenshot(rectangles, screenshot.split(',')[1], driver, true, viewport);
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

    async screenshotViewportforVerification(driver, viewport, imgPath, directory, includeClassification = false) {
        await this.setViewportHeightBeforeSnapshots(viewport);
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
                console.log(err);
                elements.push(undefined);
            }
            if (element != undefined) {
                try {
                    let rectangle = new Rectangle(await driver.getRectangle(element));
                    rectangle.selector = currentSelector;
                    rectangles.push(rectangle);
                } catch (err) {
                    console.log(err);
                    rectangles.push(undefined);
                }
            }
            else
                rectangles.push(undefined);
        }
        let screenshot = await driver.screenshot(undefined, fullPage);
        let removeHeader = false;
        if (settings.screenshotHighlights) {
            screenshot = await driver.highlight(rectangles, screenshot);
            removeHeader = true;
        }
        if (!settings.screenshotFullpage)
            screenshot = await this.clipScreenshot(rectangles, screenshot.split(',')[1], driver, true, viewport);
        let imageFileName = 'FID-' + this.ID + '-' + this.type.toLowerCase() + '-verify-' + imgPath;
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
        return imageFileName;
    }

    /**
    * Takes a screenshot of the failure.
    */
    async screenshot(driver, file, highlight = true, encoding64 = true, fullViewportHeightScreenshot = false, fullViewportWidthClipping = false) {
        await this.setViewportHeightBeforeSnapshots(driver.currentViewport);
        let fullPage = true;
        if (settings.browserMode === utils.Mode.HEADLESS)
            fullPage = false;
        let screenshot = await driver.screenshot(undefined, fullPage, encoding64);
        if (highlight === true) {
            let rectangles = await this.getRectangles(driver);
            screenshot = await driver.highlight(rectangles, screenshot);
            // use clipping while taking screenshot
            if (!settings.screenshotFullpage) {
                screenshot = await this.clipScreenshot(rectangles, screenshot.split(',')[1], driver, fullViewportWidthClipping, driver.currentViewport);
            }
            this.saveScreenshot(file, screenshot);
        } else if (fullViewportHeightScreenshot === true) {
            let rectangles = await this.getRectangles(driver);
            screenshot = await this.clipScreenshot(rectangles, screenshot, driver, fullViewportWidthClipping, driver.currentViewport);
            this.saveScreenshot(file, screenshot);
        } else {
            this.saveScreenshot(file, screenshot, false);
        }
        await this.resetViewportHeightAfterSnapshots(driver.currentViewport);
    }

    async screenshotDetached(driver, viewport, rects, imgPath, directory) {
        await this.setViewportHeightBeforeSnapshots(viewport);
        let fullPage = true;
        if (settings.browserMode === utils.Mode.HEADLESS)
            fullPage = false;
        let rectangles = rects;
        let screenshot = await driver.screenshot(undefined, fullPage, true);

        screenshot = await driver.clipSmallImage(rectangles[0]);
        let imageFileName = 'FID-' + this.ID + '-' + this.type.toLowerCase() + '-verify-' + imgPath;
        imageFileName += '.png';
        this.saveScreenshot(path.join(directory, imageFileName), screenshot, false);
        await this.resetViewportHeightAfterSnapshots(driver.currentViewport);
        return imageFileName;
    }

    async clipScreenshot(rectangles, screenshot, driver, fullViewportWidthClipping, viewport, problemArea = undefined) {
        try {
            if (problemArea === undefined) {
                problemArea = this.getClippingCoordinates(rectangles);
            }
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

    /**
     * Rectangles of this failure.
     */
    async getRectangles(driver, traverseUp = false) {
        let selectors = this.getSelectors();
        let xpaths = this.getXPaths();
        let rectangles = [];
        let elements = [];
        for (let i = 0; i < selectors.length; i++) {
            let currentSelector = selectors[i];
            let xpath = xpaths[i];
            let element = undefined;
            try {
                element = await driver.getElementBySelector(currentSelector);
                elements.push(element);
            } catch (err) {
                console.log(err);
                elements.push(undefined);
            }
            if (element != undefined) {
                try {
                    let boundingBox = await driver.getRectangle(element, traverseUp);
                    if (boundingBox === undefined || boundingBox === null || boundingBox === NaN) {
                        let rectangle = {
                            selector: currentSelector,
                            xpath: xpath,
                            isMissingValues: function () {
                                return true;
                            },
                            toString: function () {
                                return xpath + "\nNo BoundingBox."
                            }
                        };
                        rectsnapshotViewportangles.push(rectangle);
                    } else {
                        let rectangle = new Rectangle(boundingBox);
                        rectangle.selector = currentSelector;
                        rectangle.xpath = xpath;
                        rectangles.push(rectangle);
                    }
                } catch (err) {
                    console.log(err);
                    rectangles.push(undefined);
                }
            }
            else
                rectangles.push(undefined);
        }
        for (let element of elements) {
            if (element !== undefined)
                element.dispose();
        }
        return rectangles;
    }
    /**
    * Returns an object with pixels child protruding {left, right, top, bottom}.
    */
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
            this.horizontalOrVertical = 'horizontal';
            this.direction = 'left';
        }
        if (childRect.maxX > parentRect.maxX) {
            protruding.right = childRect.maxX - parentRect.maxX;
            this.horizontalOrVertical = 'horizontal';
            this.direction = 'right';
        }
        if (childRect.minY < parentRect.minY) {
            protruding.top = parentRect.minY - childRect.minY;
            this.horizontalOrVertical = 'vertical';
            this.direction = 'top';
        }
        if (childRect.maxY > parentRect.maxY) {
            protruding.bottom = childRect.maxY - parentRect.maxY;
            this.horizontalOrVertical = 'vertical';
            this.direction = 'bottom';
        }
        return protruding;
    }
    /**
    * Returns an object with number of pixels overlapping {left, right, top, bottom}.
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
                        this.horizontalOrVertical = null;
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
        if (xToClear < yToClear && xToClear != 0) this.horizontalOrVertical = 'horizontal';
        if (yToClear < xToClear && yToClear != 0) this.horizontalOrVertical = 'vertical';

        overlap.nodeRectToBeCleared = nodeRectToBeCleared;
        overlap.otherNodeRect = otherNodeRect;
        overlap.xToClear = xToClear;
        overlap.yToClear = yToClear;
        return overlap;
    }
}
module.exports = Failure;
const RLG = require('./RLG.js');
const DOM = require('./DOM.js');
const Area = require('./Area.js');

