const fs = require('fs');
const path = require('path');
const DOM = require('./DOM');
const cliProgress = require('cli-progress');
const ProgressBar = require('progress');
const RLG = require('./RLG');


class Webpage {
    constructor(uri, driver, testRange, testHeight, outputPath, pageName) {
        this.name = pageName;
        this.uri = uri;
        this.driver = driver;
        this.testRange = testRange;
        this.testHeight = testHeight;
        this.outputPath = outputPath;
        this.rlg = undefined;
        this.runCounter = 0;
        this.pageRunOutputPath = undefined;
        // add stats for repairs

        this.durationPage = new Date();
        this.durationDOM = undefined;
        this.durationDetection = undefined;
        this.durationRepair = undefined;
        this.durationClassify = undefined;
    }

    createMainOutputFile() {
        fs.mkdirSync(this.outputPath, { recursive: true });
    }

    setRunOutputPath() {
        this.runCounter++;
        console.log(this.outputPath);
        this.pageRunOutputPath = path.join(this.outputPath, 'run---' + this.runCounter);
        fs.mkdirSync(this.pageRunOutputPath);
        this.domOutputPath = path.join(this.pageRunOutputPath, 'DOM');
        fs.mkdirSync(this.domOutputPath);
        this.snapshotOutputPath = path.join(this.pageRunOutputPath, 'snapshots');
        fs.mkdirSync(this.snapshotOutputPath);

        let cssDirectory = path.join(this.pageRunOutputPath, 'CSS');
        let cssRepairedDirectory = path.join(cssDirectory, 'Repaired');
        let cssFailedDirectory = path.join(cssDirectory, 'Failed');

        fs.mkdirSync(cssDirectory);
        fs.mkdirSync(cssRepairedDirectory);
        fs.mkdirSync(cssFailedDirectory);
    }

    async navigateToPage() {
        await this.driver.goto(this.uri);
    }

    async testWebpage(navigate = true) {
        this.durationDOM = new Date();
        console.log('Testing---> ');
        this.setRunOutputPath();
        let testRange = this.testRange;
        let totalTestViewports = testRange.max - testRange.min + 1;
        let testCounter = 0;
        this.rlg = new RLG(this.pageRunOutputPath, this.name, this.runCounter);
        if (this.runCounter === 1 && navigate) {
            await this.navigateToPage();
        }
        // progress bar
        const bar = new ProgressBar('Extract RLG by capturing DOM  | [:bar] | :percent :etas | Viewports Completed :token1/' + totalTestViewports, { complete: '█', incomplete: '░', total: totalTestViewports, width: 25});

        for(let width = testRange.max; width >= testRange.min; width--) {
            testCounter++;
            await this.driver.setViewport(width, this.testHeight);
            let newDom = new DOM(this.driver, width);
            await newDom.captureDOM();
            newDom.saveRBushData(this.domOutputPath);
            this.rlg.extractRLG(newDom, width);
            bar.tick({'token1': testCounter})
        }
        this.durationDOM = new Date() - this.durationDOM;
        this.durationDetection = new Date();
        this.rlg.detectFailures();
    }

    // Classify and Screenshot the failures
    async classifyFailures() {
        this.durationClassify = new Date();
        await this.rlg.classifyFailures(this.driver, this.pageRunOutputPath + path.sep + 'Classifications.txt', this.snapshotOutputPath);
        this.durationClassify = new Date() - this.durationClassify;
    }
    async screenshotFailures() {
        await this.rlg.screenshotFailures(this.driver, this.pageRunOutputPath);
    }
}

module.exports = Webpage;