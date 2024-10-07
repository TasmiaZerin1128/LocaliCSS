const RBush = require('rbush');
const DOMNode = require('./DOMNode');
const Rectangle = require('./Rectangle');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

class DOM {
  constructor(driver, viewport) {
    // this.page = page;
    this.driver = driver;
    this.viewport = viewport;
    this.report = undefined;
    this.root = undefined;
    this.rbush = new RBush();
    this.map = new Map();
  }

  getDOMNode(xpath) {
    return this.map.get(xpath);
}

async captureDOM(allNodes = false, getComputedStyle = true, pseudoElements = [], rootElement = undefined, xpath = undefined) {
  if (rootElement !== undefined) {
    this.root = new DOMNode(rootElement);
    if (xpath === undefined)
      this.root.setXPath(await this.driver.getTagName(this.root.element), false);
    else
      this.root.xpath = xpath;
  } 
  else {
    this.root = new DOMNode(await this.driver.getBodyElement());
    this.root.setXPath(await this.driver.getTagName(this.root.element));
  }

  const traversalStackDOM = [this.root];

  while (traversalStackDOM.length > 0) {
    let domNode = traversalStackDOM.shift();
    domNode.rectangle = new Rectangle(await this.driver.getRectangle(domNode.element));
    domNode.rectangle.xpath = domNode.xpath;

    await domNode.getExplicitlyDefinedStyle(this.driver, domNode.element);

    if (getComputedStyle) {
      domNode.setComputedStyle(await this.driver.getComputedStyle(domNode.element));
      for (let pseudoElement of pseudoElements) {
        domNode[pseudoElement] = await this.driver.getComputedStyle(domNode.element, pseudoElement)
      }
    }

    domNode.setCSSVisibilityProperties(await this.driver.getVisibilityProperties(domNode.element));
    if (domNode.rectangle.visible === false) {//puppeteer determined not visible (Rectangle == null)
      domNode.visible = false;
    }

    if (allNodes || (domNode.visible && domNode.addDescendantsToRLG && domNode.rectangle.validSize && domNode.rectangle.positiveCoordinates && !settings.excludeElementsWithDisplayValue.includes(domNode.display))) {  //height and width of inline elements have no effect
      this.rbush.insert(domNode.rectangle);
    }

    this.map.set(domNode.xpath, domNode);
    const children = await this.driver.getChildren(this.page, domNode.element);
    for (let i = 0; i < children.length; i++) {
      const childNode = domNode.addChild(children[i]);
      childNode.addDescendantsToRLG = domNode.addDescendantsToRLG;
      childNode.setXPath(await this.driver.getTagName(childNode.element));
      traversalStackDOM.push(childNode);
    }
  }
}

  saveRBushData(writeDirectory) {
    const fileName = 'viewport-' + this.viewport + '-rbush.json';
    try{ 
      const filterData = JSON.parse(JSON.stringify(this.rbush.all()));
      this.removeCssNode(filterData);
      fs.writeFileSync(path.join(writeDirectory, fileName), JSON.stringify(filterData, null, 2));
    } catch (err) {
      console.log(err);
    }
  }

  // Recursive function to remove cssNode property from saving in file
  removeCssNode(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.removeCssNode(item));
    } else if (obj !== null && typeof obj === 'object') {
      delete obj.cssNode;
      Object.values(obj).forEach(item => this.removeCssNode(item));
    }
  }
}
module.exports = DOM;
