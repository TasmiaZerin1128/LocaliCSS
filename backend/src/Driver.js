const puppeteer = require('puppeteer');
const settings = require('../settings');
const { highlightColors } = require('./utils');
const utils = require('./utils');

const driver = {};

driver.start = async function start() {
  // Start the browser
  if (settings.browserMode === 'Headless') {
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

driver.createNewPages = async function createNewPages() {
  return await driver.browser.newPage();
}

driver.screenshot = async function (savePath, fullPage = false, encoding64 = true) {
    let options = {
        path: savePath,
        fullPage: fullPage
    }
    if (encoding64)
      options.encoding = "base64";
    let screenshotPromise = await driver.page.screenshot(options);
    return screenshotPromise;
}

driver.highlight = async function (rectangles, screenshot, drawViewportWidthLine = false) {
        let screenshotHighlighted = await driver.page.evaluate(async function (rectangles, screenshot, colors, viewport, drawViewportWidthLine) {
            let canvas = document.createElement("CANVAS");
            let context = canvas.getContext("2d");
            let image = new Image();
            let imgLoadPromise = new Promise((resolve, reject) => {
              image.onload = () => { resolve(); };
              image.onerror = reject;
            });
            image.src = 'data:image/png;base64,' + screenshot;
            await imgLoadPromise;
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            context.drawImage(image, 0, 0);

            //Stroke rectangles...
            context.lineWidth = 2;
            for (let i = 0; i < rectangles.length; i++) {
                let rectangle = rectangles[i];
                if (rectangle === undefined || rectangle === null)
                    continue;
                context.strokeStyle = "black";
                context.strokeRect(rectangle.minX, rectangle.minY, rectangle.width, rectangle.height);
            }
            for (let i = 0; i < rectangles.length; i++) {
                let rectangle = rectangles[i];
                if (rectangle === undefined)
                    continue;
                context.setLineDash([20 - i - 2, 8]);
                colorIndex = Math.min(i, colors.length - 1);
                context.strokeStyle = colors[colorIndex];
                context.strokeRect(rectangle.minX, rectangle.minY, rectangle.width, rectangle.height);
                context.setLineDash([]);
            }
            //Stroke viewport width line...
            if (drawViewportWidthLine) {
                context.beginPath();
                context.moveTo(viewport, 0);
                context.lineTo(viewport, canvas.height);
                context.setLineDash([4, 4]);
                context.strokeStyle = "black";
                context.stroke();
                context.setLineDash([2, 6]);
                context.strokeStyle = "white";
                context.beginPath();
                context.moveTo(viewport, 0);
                context.lineTo(viewport, canvas.height);
                context.stroke();

                context.setLineDash([]);
            }

            return canvas.toDataURL();
        }, rectangles, screenshot, highlightColors, this.currentViewport, drawViewportWidthLine);
        return screenshotHighlighted;
};

driver.clipImage = async function (screenshot, rectangle, fullViewportWidth = false, viewportWidth = Infinity) {
        let clippedScreenshot = await driver.page.evaluate(async function (rectangle, screenshot, fullViewportWidth, viewportWidth) {
            let canvas = document.createElement("CANVAS");
            let context = canvas.getContext("2d");
            let image = new Image();
            let imgLoadPromise = function () {
              return new Promise((resolve, reject) => {
                  image.onload = () => { resolve(); }; // Corrected promise resolution
                  image.onerror = reject;
              });
            };
            image.src = 'data:image/png;base64,' + screenshot;
            await imgLoadPromise();

            rectangle.minX = Math.max(0, rectangle.minX);
            rectangle.maxX = Math.min(image.naturalWidth, rectangle.maxX);
            rectangle.minY = Math.max(0, rectangle.minY);
            rectangle.maxY = Math.min(image.naturalHeight, rectangle.maxY);

            let originalAreaRequested = "minX:" + rectangle.minX + " maxX:" + rectangle.maxX + " minY:" + rectangle.minY + " maxY:" + rectangle.maxY + " width:" + rectangle.width + " height:" + rectangle.height;
            if (fullViewportWidth) {
                rectangle.minX = 0;
                rectangle.maxX = viewportWidth !== Infinity ? viewportWidth : image.naturalWidth;
            }

            rectangle.width = rectangle.maxX - rectangle.minX;
            rectangle.height = rectangle.maxY - rectangle.minY;
            if (rectangle.width <= 0 || rectangle.height <= 0) {
                throw "\nError cannot clip canvas with width: \n" +
                "minX:" + rectangle.minX + " maxX:" + rectangle.maxX + " minY:" + rectangle.minY + " maxY:" + rectangle.maxY + " width:" + rectangle.width + " height:" + rectangle.height +
                "\n image-natural-width: " + image.naturalWidth +
                " image-natural-height: " + image.naturalHeight + "\n" +
                "Originally Requested Clipping:\n " + originalAreaRequested;
            }
            canvas.width = rectangle.width;
            canvas.height = rectangle.height;
            context.drawImage(image, rectangle.minX, rectangle.minY, rectangle.width, rectangle.height, 0, 0, rectangle.width, rectangle.height);

            return canvas.toDataURL();
        }, rectangle, screenshot, fullViewportWidth, viewportWidth);
        return clippedScreenshot;
};

driver.clipSmallImage = async function (rectangle) {
  let options = {
      clip: rectangle,
      encoding: 'base64' // Ensure the screenshot is returned as a base64 string
  };
  let screenshot = await driver.page.screenshot(options);
  return screenshot;
};


driver.cropImage = async function (screenshot, top = 0, bottom = 0, left = 0, right = 0) {
        let croppedScreenshot = await driver.page.evaluate(async function (screenshot, top, bottom, left, right) {
            let canvas = document.createElement("CANVAS");
            let context = canvas.getContext("2d");
            let image = new Image();
            let imgLoadPromise = async function () {
                return new Promise((resolve, reject) => {
                    image.onload = () => { return resolve };
                    image.onerror = reject;
                });
            }
            image.src = 'data:image/png;base64,' + screenshot;
            await imgLoadPromise;

            if (image.naturalWidth <= (left + right) || image.naturalHeight <= (top + bottom)) {
                throw "\nError cropping canvas with...\n" +
                "\nimage-natural-width: " + image.naturalWidth +
                " image-natural-height: " + image.naturalHeight + "\n" +
                "Cropping Values...\nTop: " + top + "   Bottom: " + bottom + "   Left: " + left + "   Right: " + right;
            }
            canvas.width = image.naturalWidth - left - right;
            canvas.height = image.naturalHeight - top - bottom;
            context.drawImage(image, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

            return canvas.toDataURL();
        }, screenshot, top, bottom, left, right);
        return croppedScreenshot;
};

driver.scroll = async function scroll(elementHandle) {
  await this.page.evaluate((element) => {
    if (element) element.scrollIntoView();
  }, elementHandle);
};

driver.getOpacity = async function getOpacity(elementHandle) {
  return await this.page.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return style.getPropertyValue('opacity');
  }, elementHandle);
}

driver.setOpacity = async function setOpacity(elementHandle, opacityValue) {
  await this.page.evaluate((element, opacityValue) => {
    element.style.opacity = opacityValue;
  }, elementHandle, opacityValue);
};

driver.getBodyElement = async function getBodyElement(page) {
  // Get the body element from the page
  await this.page.waitForSelector('body'); 
  const body = await this.page.$('body');
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

  try {
    await driver.page.setViewport(options);
  } catch (error) {
    if (error.code === 'EBUSY') {
      console.log('Resource busy or locked');
    } else {
      throw error;
    }
  }
}

driver.goto = async function goto(uri) {
  // Navigate to the webpage URI
  this.setViewport();
  const gotoUri = await driver.page.goto(uri, { waitUntil: 'networkidle2' });
  return gotoUri;
};

driver.getElementByXPath = async function getElementByXPath(xpath) {
  try {
    // Get an element by XPath
    // await driver.page.waitForSelector('xpath/' + xpath); 
    await driver.page.waitForXPath(xpath);
    const [element] = await driver.page.$x(xpath);
    return element;
  } catch (error) {
    console.error('Error in getElementByXPath:', error);
  }
}

driver.getElementBySelector = async function getElementBySelector(selector) {
  // Get an element by CSS selector
  await driver.page.waitForSelector(selector);
  let result = await driver.page.$(selector);
  if (result === null || result === undefined) {
    throw selector + " is not a valid selector";
  }
  return result;
}

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

driver.getRectangleMultiThread = async function getRectangleMultiThread(page, element, traverseUP = false) {
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

driver.getAllStyles = async function getAllStyles(element) {
  const allStyles = await element.evaluate((el) => {
    const stylesheets = document.styleSheets;
    const result = {
      definedStyles: {},
      inlineStyles: {},
      defaultStyles: {}
    };

    // 1. Get developer-defined styles from stylesheets
    const addStylesFromRule = (style) => {
      for (let i = 0; i < style.length; i++) {
        const property = style[i];
        // Skip Tailwind CSS variables like --tw-*
        if (!property.startsWith('--tw-')) {
          result.definedStyles[property] = style.getPropertyValue(property);
        }
      }
    };

    for (const sheet of stylesheets) {
      try {
        if (!sheet.href && sheet.ownerNode.tagName !== 'STYLE') continue; // Skip certain sheets, sheet.href means it's a linked stylesheet, tagName is "LINK"; else if no href, tagName will be "STYLE"
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule) {
            if (!rule.selectorText.includes('::before') && !rule.selectorText.includes('::after')) {
              if (el.matches(rule.selectorText)) {
                addStylesFromRule(rule.style);
              }
            }
          }
        }
      } catch (e) {
        // Handle cross-origin stylesheets or inaccessible rules
        console.warn('Skipping stylesheet due to cross-origin restriction:', e);
      }
    }

    // 2. Get inline styles
    const inlineStyles = el.style;
    for (let i = 0; i < inlineStyles.length; i++) {
      const property = inlineStyles[i];
      result.inlineStyles[property] = inlineStyles.getPropertyValue(property);
    }

    // 3. Get default styles for the element
    const defaultStylesElement = document.createElement(el.tagName);
    document.body.appendChild(defaultStylesElement);
    const defaultStyles = window.getComputedStyle(defaultStylesElement);
    for (let i = 0; i < defaultStyles.length; i++) {
      const property = defaultStyles[i];
      result.defaultStyles[property] = defaultStyles.getPropertyValue(property);
    }
    document.body.removeChild(defaultStylesElement); // Clean up default element

    return result;
  });

  return allStyles;
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

driver.getChildren = async function getChildren(page, element) {
  const listHandle = await this.page.evaluateHandle((element) => element.children, element);
  const properties = await listHandle.getProperties();
  const children = [];
  for (const property of properties.values()) {
    const child = property.asElement();
    if (child) {
      children.push(child);
    }
  }

  await listHandle.dispose();
  
  return children;
};

driver.getPageHeightUsingHTMLElement = async function () {
    let htmlElement = await driver.getHTMLElement();
    let rect = await driver.getRectangle(htmlElement);
    return Math.ceil(rect.y + rect.height);
};

// Adds CSS repair using style tag and returns an element handle.
driver.addRepair = async function (repairCode) {
    let elementHandle = await driver.page.addStyleTag({ content: repairCode });
    if (settings.repairDelay != undefined && settings.repairDelay > 0) {
      await utils.resolveAfterSeconds(settings.repairDelay);
    }
    return elementHandle;
};

driver.removeRepair = async function (element) {
    if (element === undefined) {
        throw "Error: no elementHandle passed in (removeRepair)";
    }
    await this.page.evaluate((element) => { element.parentNode.removeChild(element); }, element);
};

driver.close = async function close() {
  // Close the browser
  await driver.browser.close();
};

module.exports = driver;
