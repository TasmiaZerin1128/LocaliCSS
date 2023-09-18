const settings = require("../settings");
const DOM = require("./DOM");
const Rectangle = require("./Rectangle");
const RepairStatistics = require("./RepairStatistics");
const utils = require("./utils");

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

    async setViewportHeightBeforeSnapshot(viewport = driver.currentViewport, ruleMin = undefined, ruleMax = undefined) {
        if (settings.browserMode === utils.Mode.HEADLESS) {
            let css = undefined;
            if (this.repairElementHandle === undefined) {
                let htmlElement = await driver.getHTMLElement();
                let dom = await this.getDOMFrom(driver, viewport, [], htmlElement);
                css = this.getDOMStylesCSS(dom);
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
            if (!settings.screenshotFullpage) {
                screenshot = await this.clipScreenshot(rectangles, screenshot.split(',')[1], driver, true, viewport);
            }
            let imageFileName = 'FID-' + this.ID + '-' + this.type.toLowerCase() + '-' + this.range.toShortString().trim() + '-capture-' + viewport;
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

    // DOM level verification of the reported failures
    async classify(driver, classificationFile, snapshotDirectory, bar) {
        this.durationFailureClassify = new Date();
        let range = this.range;

        await driver.setViewport(range.getNarrower(), settings.testingHeight);
        range.narrowerClassification = await this.isFalling(driver, range.getNarrower(), classificationFile, range) ? 'TP' : 'FP';
        if (settings.screenshotNarrower === true)
            await this.snapshotViewport(driver, range.getNarrower(), snapshotDirectory, true);

        await driver.setViewport(range.getMinimum(), settings.testingHeight);

    }
}

module.exports = Failure;