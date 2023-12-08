const fs = require('fs');
const path = require('path');
const DOM = require('./DOM');
const cliProgress = require('cli-progress');
const ProgressBar = require('progress');
const RLG = require('./RLG');
const { sendMessage } = require('../socket-connect');
const utils = require('./utils');


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
        utils.testOutputPath = utils.testOutputPath.concat(this.pageRunOutputPath);
        console.log(utils.testOutputPath);
        fs.mkdirSync(this.pageRunOutputPath);
        this.domOutputPath = path.join(this.pageRunOutputPath, 'DOM');
        fs.mkdirSync(this.domOutputPath);
        this.snapshotOutputPath = path.join(this.pageRunOutputPath, 'snapshots');
        utils.testOutputSnapshot = this.snapshotOutputPath;
        let snaprepairedDirectory = path.join(this.snapshotOutputPath, 'Repaired');
        fs.mkdirSync(this.snapshotOutputPath);
        fs.mkdirSync(snaprepairedDirectory);

        let cssDirectory = path.join(this.pageRunOutputPath, 'CSS');
        utils.testOutputCSS.concat(cssDirectory);
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

        for(let width = testRange.max; width >= testRange.min; width--) {
            testCounter++;
            await this.driver.setViewport(width, this.testHeight);
            let newDom = new DOM(this.driver, width);
            await newDom.captureDOM();
            newDom.saveRBushData(this.domOutputPath);
            this.rlg.extractRLG(newDom, width);
            sendMessage("Extract RLG", {'counter': testCounter, 'total': totalTestViewports});
            bar.tick({'token1': testCounter});
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

    printRLG() {
        this.rlg.printGraph(path.join(this.pageRunOutputPath, 'RLG.txt'));
    }

    printFailures() {
        this.rlg.printFailuresTXT(path.join(this.pageRunOutputPath, 'Failures.txt'));
        this.rlg.printFailuresCSV(path.join(this.pageRunOutputPath, 'Failures.csv'), this.name, this.runCounter);
    }

    printWorkingRepairs() {
        let file = path.join(this.pageRunOutputPath, 'repairs.csv');
        let text =
            "Webpage,Run,FID,Type,RangeMin,RangeMax,XPath1,XPath2,ClassNarrower,ClassMin,ClassMid,ClassMax,ClassWider,Repair,RepairOutcome";
        fs.appendFileSync(file, text, function (err) {
            if (err) throw err;
        });
        this.rlg.printWorkingRepairs(file, this.name, this.runCounter);
    }

    async repairFailures() {
        console.log("repair started");
        this.durationRepair = new Date();
        await this.rlg.repairFailures(this.driver, this.pageRunOutputPath, this.name, this.runCounter);
        this.durationRepair = new Date() - this.durationRepair;
        this.printWorkingRepairs();
    }
}

module.exports = Webpage;