const driver = require('./src/Driver');
const Webpage = require('./src/Webpage');
const settings = require('./settings');
const path = require('path');
const { Range } = require('./src/Range');
const utils = require('./src/utils');
const JSZip = require('jszip');
const fs = require('fs');
const axios = require('axios');

const zip = new JSZip();

async function isWebpage(url) {

  const response = await axios.head(url, { validateStatus: () => true });
  const contentType = response.headers['content-type'];
  console.log(contentType);

  if(contentType.startsWith('text/html')) return true;
  return false;
}

exports.startTool = async (req, res) => {
  try {
    await driver.start();
    const page = await driver.createPage();

    let url = req.query.url;
    console.log(url);

    await driver.goto(url);
    // take all hrefs
    // let hrefs = await page.evaluate(() => {
    //   let Element = Array.from(document.body.querySelectorAll('a'), (el) => el.href);
    //   return Array.from(new Set(Element));
    // });
    // // only select webpages with text/html
    // let webpages = [];
    // for (let i = 0; i < hrefs.length; i++) {
    //   if(await isWebpage(hrefs[i])) {
    //     webpages.push(hrefs[i]);
    //   }
    // }
    // console.log(webpages);
    //https://dshe.gov.bd
    // https://acc.org.bd/
    //https://teachers.gov.bd/
    //http://www.dphe.gov.bd/
    //https://tasmiazerin1128.github.io/my-minimalist-portfolio/
    let testRange = new Range(settings.testWidthMin, settings.testWidthMax);
    let currentDateTime = utils.getDateTime();

    // for (let i = 0; i < webpages.length; i++) {
      let pageName = utils.parseName(url);
      let testOutputPath = path.join(path.join('output', currentDateTime), pageName);
    
      let newWebpage = new Webpage(url, driver, testRange, settings.testingHeight, testOutputPath, pageName);
      newWebpage.createMainOutputFile();
      await newWebpage.navigateToPage();
      await newWebpage.testWebpage();
      await newWebpage.classifyFailures();
      newWebpage.printRLG();
      newWebpage.printFailures();
      await newWebpage.repairFailures();
    // }

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
  console.log("path ==> " + utils.testOutputPath);
  if(fileName.includes('RLG')) {
    res.download(utils.testOutputPath + '/RLG.txt');
    // res.download('output/2023-11-16-04-03-25/tasmiazerin1128.github.io/run---1/RLG.txt');
  }
  if(fileName.includes('RLF')) {
    res.setHeader('Content-Type', 'text/csv');
    res.download(utils.testOutputPath + '/Failures.csv');
  }
  if(fileName.includes('RLF_snapshot')) {
    res.setHeader('Content-Type', 'text/csv');
    res.download(utils.testOutputPath + '/Failures.csv');
  }
  console.log('Sending file');
}

exports.sendZipFailures = async (req, res) => {
  let type = req.params.type;
  if (type === 'RLF_snapshot') {
    folderPath = utils.testOutputPath + '/snapshots';
  } else if (type === 'repair') {
    folderPath = utils.testOutputPath + '/CSS';
  } else {
    folderPath = utils.testOutputPath;
  }
  utils.addToZip(zip, folderPath);

  zip.generateAsync({type:"nodebuffer"}).then((buffer) => {
    res.setHeader('Content-Disposition', `attachment; filename=${type}.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.status(200).send(buffer);
  })
  .catch((err) => {
    console.error('Error generating zip:', err);
    res.status(500).send('Error generating the zip file.');
  });
  console.log('Sending file');
}

async function findImage(folderPath, keyword1, keyword2) {
  const images = await fs.promises.readdir(folderPath);
  for (const image of images) {
    const filename = path.basename(image);
    if (filename.includes(keyword1) && (!keyword2 || filename.includes(keyword2))) {
      console.log(filename);
      return path.join(folderPath, image);
    }
  }
  return null;
}

exports.sendSnapshots = async (req, res) => {

  let imagesFolder = utils.testOutputPath + '/snapshots';

  try {
    const imagePromises = [];

    // search failure image
    const fid1Image = await findImage(imagesFolder, 'FID-' + req.params.image + '-', 'TP');
    if (fid1Image) {
      imagePromises.push(
        fs.promises.readFile(fid1Image)
          .then((imageBuffer) => Buffer.from(imageBuffer).toString('base64'))
      );
    }

    // Search repaired image
    if (imagePromises.length > 0) {
    const repairedImage = await findImage(imagesFolder, 'FID-' + req.params.image + '-', 'repaired');
    if (repairedImage) {
      imagePromises.push(
        fs.promises.readFile(repairedImage)
          .then((imageBuffer) => Buffer.from(imageBuffer).toString('base64'))
      );
    }
  }

    const images = await Promise.all(imagePromises);

    res.send({ images });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error reading images' });
  }

}