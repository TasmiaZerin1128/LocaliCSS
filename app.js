const fs = require('fs');
const driver = require('./src/Driver');
const Webpage = require('./src/Webpage');
const settings = require('./settings');
const path = require('path');
const { Range } = require('./src/Range');

const startTool = async () => {
  let webpages = [];
  await driver.start();
  const page = await driver.createPage();

  let url = 'https://teachers.gov.bd/';
  let testRange = new Range(settings.testWidthMin, settings.testWidthMax);
  // await driver.goto(url);

  let pageName = 'webpage';
  let testOutputPath = path.join(settings.runOutputFile, pageName);
  let newWebpage = new Webpage(url, driver, testRange, settings.testingHeight, testOutputPath, pageName);
  newWebpage.createMainOutputFile();
  await newWebpage.navigateToPage();
  await newWebpage.testWebpage();
  await newWebpage.classifyFailures();

  //   await page.setViewport({ width: 1200, height: 1024 });
  //   const element = await page.$('.SDkEP');
  //   await page.evaluate((el) => el.style.border = '5px solid red', element);

  //   await page.screenshot({ path: `google${1200}.png` });

  console.log('completed ');

  await driver.close();
};

startTool();
