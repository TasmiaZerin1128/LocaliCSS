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

  if(contentType.startsWith('text/html')) return true;
  return false;
}

runTool = async () => {
  let testRange = new Range(settings.testWidthMin, settings.testWidthMax);
  let currentDateTime = utils.getDateTime();

  let webpages = [];

  settings.URLs.forEach(async (url) => {
    let pageName = undefined;
      if (url.includes(settings.webpagesDirectory.replace(/\\/g, "/"))) {
          pageName = url.split(settings.webpagesDirectory.replace(/\\/g, "/") + '/')[1].replace(/\\/g, "-").replace(/\//g, "-").replace(/\:/g, "-").replace(/\./g, "-");;
      } else {
          if (isWebpage(url)) {
            pageName = utils.parseName(url);
          } else {
            pageName = url.replace(/\\/g, "-").replace(/\//g, "-").replace(/\:/g, "-").replace(/\./g, "-");
          }
      }
    let testOutputPath = path.join(settings.runOutputFile, pageName);
    webpages.push(new Webpage(url, driver, testRange, settings.testingHeight, testOutputPath, pageName));
  });

  for(let newWebpage of webpages) {
    newWebpage.createMainOutputFile();
    await newWebpage.navigateToPage();
    await newWebpage.testWebpage();
    await newWebpage.classifyFailures();
    newWebpage.printRLG();
    newWebpage.printFailures();
    newWebpage.localizeCSS();
    await newWebpage.verifyFailures();
  }

  console.log('completed ');
}

async function load_subjects() {
  console.log('loading subjects');
  if (settings.URLs.length === 0) {
    let mainDirectory = settings.webpagesDirectory;
    let allFiles = fs.readdirSync(mainDirectory);
    while (allFiles.length > 0) {
        let file = allFiles.shift();
        if (file.toLowerCase().includes('index.html') && file.toLocaleLowerCase().includes('index.htm')) {
            if (settings.not !== undefined && settings.not.length > 0) {
                let testSubject = true;
                for (let name of settings.not)
                    if (file.toLocaleLowerCase().replace(/\\/g, "-").replace(/\//g, "-").replace(/\:/g, "-").replace(/\./g, "-").includes(name.toLocaleLowerCase())) {
                        testSubject = false;
                        break;
                    }
                if (testSubject) {
                    settings.URLs.push('file://' + path.join(mainDirectory, file).replace(/\\/g, "/"));
                }
            }
            else if (settings.only !== undefined && settings.only.length > 0) {
                for (let name of settings.only) {
                    if (file.toLocaleLowerCase().replace(/\\/g, "-").replace(/\//g, "-").replace(/\:/g, "-").replace(/\./g, "-").includes(name.toLocaleLowerCase())) {
                        settings.URLs.push('file://' + path.join(mainDirectory, file).replace(/\\/g, "/"));
                        break;
                    }
                }

            } else {
                settings.URLs.push('file://' + path.join(mainDirectory, file).replace(/\\/g, "/"));
            }
            //if (file.toLowerCase().includes('index.html') && file.toLocaleLowerCase().includes('index.htm')) {
        } else if (fs.statSync(path.join(mainDirectory, file)).isDirectory()) {
            let subFiles = fs.readdirSync(path.join(mainDirectory, file));
            let extendedPathSubFiles = subFiles.map(newFile => { return file + path.sep + newFile; })
            allFiles = [...allFiles, ...extendedPathSubFiles];
        }
    }
}
}

exports.startLocal = async (req, res) => {
  try {
    await driver.start();
    const page = await driver.createPage();

    load_subjects();
    await runTool();

    await driver.close();
    return res.status(200).json('completed');

  } catch (err) {
    console.log('Error: ', err);
    await driver.close();
    return res.status(500).json('Something went wrong');
  }
}

exports.startTool = async (req, res) => {

  let cookies = []
  
  try {
    await driver.start();
    const page = await driver.createPage();

    let url = req.query.url;
    console.log(url);

    settings.URLs.push(url);
    await driver.goto(url);
    await runTool();

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