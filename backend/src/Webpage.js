const fs = require('fs');
const path = require('path');
const DOM = require('./DOM');
const cliProgress = require('cli-progress');
const ProgressBar = require('progress');
const RLG = require('./RLG');
const { sendMessage } = require('../socket-connect');
const utils = require('./utils');
const pLimit = require('p-limit');
const driver = require('./Driver');

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

        this.durationPage = new Date();
        this.durationDOM = undefined;
        this.durationDetection = undefined;
        this.durationVerification = undefined;
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
        utils.testOutputPath = utils.testOutputPath.concat(this.pageRunOutputPath);
        console.log(utils.testOutputPath);
        fs.mkdirSync(this.pageRunOutputPath);
        this.domOutputPath = path.join(this.pageRunOutputPath, 'DOM');
        fs.mkdirSync(this.domOutputPath);
        this.snapshotOutputPath = path.join(this.pageRunOutputPath, 'snapshots');
        utils.testOutputSnapshot = this.snapshotOutputPath;
        fs.mkdirSync(this.snapshotOutputPath);

        let cssDirectory = path.join(this.pageRunOutputPath, 'CSS');
        utils.testOutputCSS.concat(cssDirectory);
        let cssFailedDirectory = path.join(cssDirectory, 'Failed');

        fs.mkdirSync(cssDirectory);
        fs.mkdirSync(cssRepairedDirectory);
        fs.mkdirSync(cssFailedDirectory);
    }

    async navigateToPage() {
        await this.driver.goto(this.uri);
    }

    async testWebpage(navigate = true) {
        let limit = pLimit(10);

        this.durationDOM = new Date();
        sendMessage("message", 'Testing---> ');
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

        let tasks = [];

        for(let width = testRange.max; width >= testRange.min; width--) {
            // tasks.push(limit(async () => {
                // const page = await this.driver.createPage();
                testCounter++;
                let height = this.testHeight;
                await this.driver.setViewport(width, height);
                let newDom = new DOM(this.driver, width);
                await newDom.captureDOM();
                newDom.saveRBushData(this.domOutputPath);
                this.rlg.extractRLG(newDom, width);
                sendMessage("Extract RLG", {'counter': testCounter, 'total': totalTestViewports});
                bar.tick({'token1': testCounter});

                // await page.close();
            // }));
        }

        // await Promise.all(tasks);
        this.durationDOM = new Date() - this.durationDOM;
        this.durationDetection = new Date();
        await this.rlg.detectFailures(this.driver);
    }

    // Classify and Screenshot the failures
    async classifyFailures() {
        this.durationClassify = new Date();
        await this.rlg.classifyFailures(this.driver, this.pageRunOutputPath + path.sep + 'Classifications.txt', this.snapshotOutputPath);
        this.durationClassify = new Date() - this.durationClassify;
    }

    // Verify the failures
    async verifyFailures() {
        this.durationVerification = new Date();
        await this.rlg.verifyFailures(this.driver, this.pageRunOutputPath + path.sep + 'Verifications.txt', this.snapshotOutputPath);
        this.durationVerification = new Date() - this.durationVerification;
    }

    async localizeCSS() {
        await this.rlg.localizeCSS(this.driver, this.pageRunOutputPath + path.sep + 'Localization.txt', this.pageRunOutputPath + path.sep + 'DeveloperDefinedCSS.txt');
    }

    async repairCSS() {
        await this.rlg.repairCSS(this.driver, this.pageRunOutputPath + path.sep + 'LLM-Repair.txt');
    }

    async screenshotFailures() {
        await this.rlg.screenshotFailures(this.driver, this.pageRunOutputPath);
    }

    printRLG() {
        this.rlg.printGraph(path.join(this.pageRunOutputPath, 'RLG.txt'));
    }

    printFailures() {
        this.rlg.printFailuresTXT(path.join(this.pageRunOutputPath, 'Failures.txt'));
        this.rlg.printFailuresCSV(path.join(this.pageRunOutputPath, 'Failures.csv'), this.name, this.runCounter);
    }

}

module.exports = Webpage;