const settings = require("../settings");
const Failure = require("./Failure");
const Rectangle = require("./Rectangle");
const utils = require("./utils");

class WrappingFailure extends Failure {
    constructor(node, row, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.row = row;
        this.range = range;
        this.type = FailureType.WRAPPING;
        this.outputDirectory = outputDirectory;
        if (settings.humanStudy === true)
            this.setupHumanStudyData();
    }

    // Get xpaths of this failure
    getXPaths() {
        let xpaths = [];
        xpaths.push(this.node.xpath);
        for (let rowElement of this.row) {
            xpaths.push(rowElement.xpath);
        }
        return xpaths;
    }

    // Get selectors of this failure
    getSelectors() {
        let selectors = [];
        selectors.push(this.node.getSelector());
        for (let rowElement of this.row) {
            xpaths.push(rowElement.getSelector());
        }
        return xpaths;
    }

    print(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toString() + ' ]';
        utils.printToFile(file, text);
        for (let i = 0; i < this.row.length; i++) {
            text = '|  |  |--[ Row Element: ' + this.row[i].xpath + ' ]';
            utils.printToFile(file, text);
        }
    }
    printClassified(file) {
        let text = '|  |--[ ' + this.type + ' (' + this.ID + '): ' + this.range.toClassifiedString() + ' ]';
        utils.printToFile(file, text);
        for (let i = 0; i < this.row.length; i++) {
            text = '|  |  |--[ Row Element: ' + this.row[i].xpath + ' ]';
            utils.printToFile(file, text);
        }
    }

    async isFailing(driver, viewport, file) {
        if (this.row.length < settings.rowThreshold)
            return true;
        let rowXPaths = [];
        for (let rowElement of this.row)
            rowXPaths.push(rowElement.xpath);
        let rowSelectors = [];
        for (let rowElement of this.row)
            rowSelectors.push(rowElement.getSelector());

        let wrappedElement = await driver.getElementBySelector(this.node.getSelector());
        let rowElements = [];
        for (let rowSelector of rowSelectors)
            rowElements.push(await driver.getElementBySelector(rowSelector));
        let wrappedRect = new Rectangle(await driver.getRectangle(wrappedElement));
        let rowRectangles = [];
        for (let rowElement of rowElements)
            rowRectangles.push(new Rectangle(await driver.getRectangle(rowElement)));
        let result = undefined;
        if (wrappedRect.visible === false || wrappedRect.validSize === false || wrappedRect.positiveCoordinates == false)
            result = false;
        let ok = [];
        for (let rowRect of rowRectangles) {
            if (rowRect.visible === false || rowRect.validSize === false || rowRect.positiveCoordinates == false)
                ok.push('no');
            else {
                ok.push('yes');
                break;
            }
        }
        if (!ok.includes('yes'))
            result = false;
        if (result === undefined)
            result = this.isBelowOrAboveRow(wrappedRect, rowRectangles);


        if (file !== undefined) {
            let classification = result ? 'TP' : 'FP';
            let text = 'ID: ' + this.ID + ' Type: ' + this.type + ' Range:' + this.range.toString() + ' Viewport:' + viewport + ' Classification: ' + classification;
            utils.printToFile(file, text);
            text = '|--[ Wrapped-Element: ' + this.node.xpath + ' ]';
            utils.printToFile(file, text);
            if (wrappedRect.visible === false || wrappedRect.validSize === false || wrappedRect.positiveCoordinates == false) {
                text = '|  |--[ Visible: ' + (wrappedRect.visible ? 'True' : 'False') + ' Valid-Size: ' + (wrappedRect.validSize ? 'True' : 'False') + ' Positive-Coordinates: ' + (wrappedRect.positiveCoordinates ? 'True' : 'False') + ' ]';
                utils.printToFile(file, text);
            }
            text = '|  |--[ minX: ' + wrappedRect.minX + ' maxX: ' + wrappedRect.maxX + ' minY: ' + wrappedRect.minY + ' maxY: ' + wrappedRect.maxY + ' width: ' + wrappedRect.width + ' height: ' + wrappedRect.height + ' ]';
            utils.printToFile(file, text);
            for (let i = 0; i < rowElements.length; i++) {
                let xpath = rowXPaths[i];
                let rowRect = rowRectangles[i];
                text = '|--[ Row Element: ' + xpath + ' ]';
                utils.printToFile(file, text);
                if (rowRect.visible === false || rowRect.validSize === false || rowRect.positiveCoordinates == false) {
                    text = '|  |--[ Visible: ' + (rowRect.visible ? 'True' : 'False') + ' Valid-Size: ' + (rowRect.validSize ? 'True' : 'False') + ' Positive-Coordinates: ' + (rowRect.positiveCoordinates ? 'True' : 'False') + ' ]';
                    utils.printToFile(file, text);
                }
                text = '|  |--[ minX: ' + rowRect.minX + ' maxX: ' + rowRect.maxX + ' minY: ' + rowRect.minY + ' maxY: ' + rowRect.maxY + ' width: ' + rowRect.width + ' height: ' + rowRect.height + ' ]';
                utils.printToFile(file, text);
            }
        }
        return result;
    }

    isBelowOrAboveRow(wrappedRectangle, rowRectangles) {
        for (let rowRectangle of rowRectangles) {
            if (wrappedRectangle.minY + settings.tolerance.smallrange >= rowRectangle.maxY)
                return true;
            if (wrappedRectangle.maxY - settings.tolerance.smallrange <= rowRectangle.minY)
                return true;
        }
        return false;
    }
}

module.exports = WrappingFailure;