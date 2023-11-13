const driver = require('./src/Driver');
const Webpage = require('./src/Webpage');
const settings = require('./settings');
const path = require('path');
const { Range } = require('./src/Range');
const utils = require('./src/utils');
const JSZip = require('jszip');
const fs = require('fs');

const zip = new JSZip();

exports.startTool = async (req, res) => {
  let webpages = [];
  try {
    await driver.start();
    const page = await driver.createPage();

    let url = req.query.url;
    console.log(url);
    //https://teachers.gov.bd/
    //http://www.dphe.gov.bd/
    //https://sharifmabdullah.github.io/
    let testRange = new Range(settings.testWidthMin, settings.testWidthMax);
    // await driver.goto(url);

    let pageName = utils.parseName(url);
    let testOutputPath = path.join(settings.runOutputFile, pageName);
    let newWebpage = new Webpage(url, driver, testRange, settings.testingHeight, testOutputPath, pageName);
    newWebpage.createMainOutputFile();
    await newWebpage.navigateToPage();
    await newWebpage.testWebpage();
    await newWebpage.classifyFailures();
    newWebpage.printRLG();
    newWebpage.printFailures();
    await newWebpage.repairFailures();

    console.log('completed ');

    await driver.close();
    return res.status(200).json('completed');

  } catch (err) {
    console.log('Error: ', err);
    await driver.close();
    return res.status(500).json('Something went wrong');
  }
};

exports.sendResultFile = async (req, res) => {
  let fileName = req.params.file;
  console.log(fileName);
  if(fileName.includes('RLG')) {
    res.download('output/2023-11-13-10-36-54/sharifmabdullah.github.io/run---1/RLG.txt');
  }
  if(fileName.includes('RLF')) {
    res.setHeader('Content-Type', 'text/csv');
    res.download('output/2023-11-13-21-10-42/sharifmabdullah.github.io/run---1/Failures.csv');
  }
  console.log('Sending file');
}

exports.sendZipFailures = async (req, res) => {
  folderPath = 'output/2023-10-24-21-10-47/airbnb.com/run---1';
  utils.addToZip(zip, folderPath);

  zip.generateAsync({type:"nodebuffer"}).then((buffer) => {
    res.setHeader('Content-Disposition', 'attachment; filename=myFolder.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.status(200).send(buffer);
  })
  .catch((err) => {
    console.error('Error generating zip:', err);
    res.status(500).send('Error generating the zip file.');
  });
  console.log('Sending file');
}