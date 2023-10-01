const driver = require('./src/Driver');
const Webpage = require('./src/Webpage');
const settings = require('./settings');
const path = require('path');
const { Range } = require('./src/Range');
const utils = require('./src/utils');

exports.startTool = async (req, res) => {
  let webpages = [];
  await driver.start();
  const page = await driver.createPage();

  let url = req.body.url;
  console.log(url);
  //https://teachers.gov.bd/
  //http://www.dphe.gov.bd/
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

  console.log('completed ');

  await driver.close();
};