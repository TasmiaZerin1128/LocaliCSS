const fs = require('fs');
const utils = require('./utils');
const CSSNode = require('./CSSNode');

class DOMNode {
  constructor(element) {
    this.element = element;
    this.parent = undefined;
    this.children = [];

    this.containedBy = [];
    this.containerOf = [];

    this.xpath = undefined;
    this.tagName = undefined;
    this.xptagName = undefined;
    this.rectangle = undefined;

    this.visible = undefined;
    this.addDescendantsToRLG = true; // add descendants to RLG

    // css properties used to determine visibility.
    this.display = undefined;
    this.visibility = undefined;
    this.opacity = undefined;
    this.filter = undefined;
    this.transform = undefined;
    this.overflow = undefined;
    this.clipPath = undefined;
  }

  setXPath(tagName, addHTML = true) {
    if (tagName === undefined) {
      throw new Error('setXPath: tagName must be defined');
    }

    if (this.parent === undefined) {
      this.xptagName = tagName;
      if (addHTML) { 
        this.xpath = `/HTML/${this.xptagName}`; 
      } else { 
        this.xpath = `/${this.xptagName}`; 
      }
    } else {
      let isSVG = false;
      if (tagName === 'svg' || this.parent.xpath.includes('*' + '[name()=\'' + 'svg' + '\']' )) {
        isSVG = true;
        this.tagName = '*' + '[name()=\'' + 'svg' + '\']';
      } else {
        this.tagName = tagName; 
      }

      let countTags = 0;
      for (let i = 0; i < this.parent.children.length; i++) {
        if (this.parent.children[i].tagName === this.tagName) {
          countTags++;
        }
      }
      if (countTags > 1) {
        this.xptagName = `${this.tagName}[${countTags}]`;
      } else {
        this.xptagName = this.tagName; // first element has no number
      }
      // add xpath for SVG
      if (isSVG) {
        this.xpath = this.parent.xpath + '//' + this.xptagName;
      } else {
        this.xpath = this.parent.xpath + '/' + this.xptagName;;
      }
    }
  }

  async getExplicitlyDefinedStyle(driver, element) {
    this.cssNode = new CSSNode(element, this.xpath, driver);
    await this.cssNode.findProperties();
    console.log("Defined Styles:")
    console.log(this.cssNode.developerCssProperties);
  }

  setComputedStyle(computedStyles) {
    this.computedStyles = computedStyles;
  }

  getComputedStyle() {
    return this.computedStyles;
}

getSelector() {
  if (this.xpath === undefined || this.xpath === "")
      return undefined;
  let elements = this.xpath.split("/");
  let selector = ""
  for (let element of elements) {
      if (element === "") {
          continue;
      }
      else if (element.includes("[")) {
          if (element.includes(utils.svg.prefix)) {
              element = element.replace(utils.svg.prefix, "");
              element = element.replace(utils.svg.prefix, "");
          }
          if (element.includes("[")) {
              element = element.replace("[", ":nth-of-type(");
              element = element.replace("]", ")");
          } else {
              element = element + ":nth-of-type(1)"
          }
      } else {
          element = element + ":nth-of-type(1)"
      }
      if (selector === "")
          selector = element.toLowerCase();
      else
          selector = selector + " > " + element.toLowerCase();
  }
  return selector;
}

  setCSSVisibilityProperties(properties) {
        this.display = properties.display;
        this.visibility = properties.visibility;
        this.opacity = properties.opacity;
        this.filter = properties.filter;
        this.transform = properties.transform;
        this.overflow = properties.overflow;
        this.clipPath = properties.clipPath;
        this.color = properties.color;
        this.backgroundColor = properties.backgroundColor;
        this.borderLeftColor = properties.borderLeftColor;
        this.borderRightColor = properties.borderRightColor;
        this.borderTopColor = properties.borderTopColor;
        this.borderBottomColor = properties.borderBottomColor;

        this.setVisibility();
  }

  setVisibility() {
    let extendsVisibility = (this.opacity !== '0' && this.display !== 'none' && this.filter !== 'opacity(0)' && this.transform !== 'scale(0)' &&
    !this.clipPath.includes('circle(0px') &&
    !(this.overflow === 'hidden' && (this.rectangle.height === 0 || this.rectangle.width == 0)));

    let transparentColor = 
      this.color.includes('rgba') && this.color.includes('0)') &&
      this.backgroundColor.includes('rgba') && this.backgroundColor.includes('0)') &&
      this.borderLeftColor.includes('rgba') && this.borderLeftColor.includes('0)') &&
      this.borderRightColor.includes('rgba') && this.borderRightColor.includes('0)') &&
      this.borderTopColor.includes('rgba') && this.borderTopColor.includes('0)') &&
      this.borderBottomColor.includes('rgba') && this.borderBottomColor.includes('0)');

    this.visible = (this.visibility !== 'hidden' && extendsVisibility && !transparentColor);

    if(!extendsVisibility) {
      this.addDescendantsToRLG = false;
    }
  }

  addChild(childElement) {
    const newChild = new DOMNode(childElement);
    newChild.parent = this;
    this.children.push(newChild);
    return newChild;
  }
}

module.exports = DOMNode;
