const settings = require("../settings");
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