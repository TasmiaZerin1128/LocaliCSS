const puppeteer = require('puppeteer');
const settings = require('../settings');

const driver = {};

driver.start = async function start() {
  // Start the browser
  if (settings.browserMode === 'headless') {
    driver.browser = await puppeteer.launch({
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
  return driver.page;
};

driver.getBodyElement = async function getBodyElement() {
  // Get the body element from the page
  const body = await driver.page.$('body');
  return body;
};

driver.getTagName = async function getTagName(element) {
  // Get the tagname of an element
  const tagName = await element.evaluate((element) => element.tagName);
  return tagName;
};

driver.getHTMLElement = async function getHTMLElement() {
  let htmlElement = await driver.page.$('html');
  return htmlElement;
}

driver.setViewport = async function setViewport(width, height) {
  let options  = { width: width || settings.testWidthMin,
    height: height || settings.testingHeight,
    deviceScaleFactor: 1,
  };

  await driver.page.setViewport(options);
}

driver.goto = async function goto(uri) {
  // Navigate to the webpage URI
  this.setViewport();
  const gotoUri = await driver.page.goto(uri);
  return gotoUri;
};

driver.getRectangle = async function getRectangle(element, traverseUP = false) {
  let rect = await element.boundingBox();
  if (traverseUP && rect === null) {
    while (rect === null) {
      element = await element.getProperty('parentNode');
      if (element === undefined || element === null) { throw new Error('No more elements in the DOM'); }
      rect = await element.boundingBox();
    }
  }
  return rect;
};

driver.getComputedStyle = async function getComputedStyle(element, pseudoElement = undefined) {
  let styles = await element.evaluate(
    (element, pseudoElement) => {
        let style = undefined;
        if (pseudoElement !== undefined) {
            let pe = ':' + pseudoElement;
            style = window.getComputedStyle(element, pe);
        } else {
            style = window.getComputedStyle(element);
        }
        return [...style].reduce((elementStyles, property) => ({ ...elementStyles, [property]: style.getPropertyValue(property) }), {})
    }, element, pseudoElement)
  return styles;
}

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
  const listHandle = await driver.page.evaluateHandle((element) => element.children, element);
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
