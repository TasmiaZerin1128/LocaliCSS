const RBush = require('rbush');
const DOMNode = require('./DOMNode');
const Rectangle = require('./Rectangle');
const Driver = require('./Driver');
const fs = require('fs');
const path = require('path');

class DOM {
  constructor(driver, viewport) {
    this.driver = driver;
    this.viewport = viewport;
    this.report = undefined;
    this.root = undefined;
    this.rbush = new RBush();
    this.map = new Map();
  }

  async captureDOM(rootElement = undefined, xpath = undefined) {
    this.root = new DOMNode(await this.driver.getBodyElement());
    this.root.setXPath(await this.driver.getTagName(this.root.element));

    const traversalStackDOM = [];
    traversalStackDOM.push(this.root);
    while (traversalStackDOM.length > 0) {
      const domNode = traversalStackDOM.shift();
      domNode.rectangle = new Rectangle(await Driver.getRectangle(domNode.element));
      domNode.rectangle.xpath = domNode.xpath;

      domNode.setCSSVisibilityProperties(await this.driver.getVisibilityProperties(domNode.element));
      if (domNode.rectangle.visible === false) {//puppeteer determined not visible (Rectangle == null)
        domNode.visible = false;
      }

      if (domNode.visible && domNode.addDescendantsToRLG && domNode.rectangle.validSize && domNode.rectangle.positiveCoordinates) {
        this.rbush.insert(domNode.rectangle);
      }

      this.map.set(domNode.xpath, domNode);
      const children = await this.driver.getChildren(domNode.element);
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
      fs.writeFileSync(path.join(writeDirectory, fileName), JSON.stringify(this.rbush.toJSON(), null, 2));
    } catch (err) {
      console.log(err);
    }
  }
}
module.exports = DOM;
