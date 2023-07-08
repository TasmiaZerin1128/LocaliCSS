const puppeteer = require('puppeteer');
const settings = require('../settings');

const driver = {};

driver.start = async function start() {
  // Start the browser
  if (settings.browserMode === 'headless') {
    driver.browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
    });
  } else {
    driver.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
    });
  }
};

driver.createPage = async function createPage() {
  // Create a new page
  driver.page = await driver.browser.newPage();
  driver.page.setViewport({ width: 1380,
    height: settings.testingHeight,
    deviceScaleFactor: 1,
  });
  return driver.page;
};

driver.getBodyElement = async function getBodyElement() {
  // Get the body element from the page
  const body = await driver.page.$('body');
  return body;
};

driver.getTagName = async function getTagName(element) {
  // Get the tagname of an element
  const tagName = await element.evaluate((el) => el.tagName);
  return tagName;
};

driver.goto = async function goto(uri) {
  // Navigate to the webpage URI
  const gotoUri = await driver.page.goto(uri);
  return gotoUri;
};

driver.getRectangle = async function getRectangle(element, traverseUP = false) {
  let rect = await element.boundingBox();
  if (traverseUP && rect === null) {
    while (rect === null) {
      rect = await element.getProperty('parentNode');
      if (rect === undefined || rect === null) { throw new Error('No more elements in the DOM'); }
      rect = await rect.boundingBox();
    }
  }
  return rect;
};

driver.getVisibilityProperties = async function (element) {
  let properties = await element.evaluate((element) => {
    const style = window.getComputedStyle(element);

    const properties =
      {
        visibility: style.visibility,
        opacity: style.opacity,
        display: style.display,
        filter: style.filter,
        transform: style.transform,
        overflow: style.overflow,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderLeftColor: style['border-left-color'],
        borderRightColor: style['border-right-color'],
        borderTopColor: style['border-top-color'],
        borderBottomColor: style['border-bottom-color'],
        clipPath: style['clip-path']
      }
      return properties;
    }, element)
  return properties;
};

driver.getChildren = async function getChildren(element) {
  const listHandle = await driver.page.evaluateHandle((el) => el.children, element);
  const properties = await listHandle.getProperties();
  const children = [];
  for (const property of properties.values()) {
    const child = property.asElement();
    if (child) {
      children.push(child);
    }
  }
  return children;
};

driver.close = async function close() {
  // Close the browser
  await driver.browser.close();
};

module.exports = driver;
