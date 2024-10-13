const settings = require('../settings.js');
const utils = require('./utils.js');
const path = require('path');

class CollisionLocalize {
    constructor(failure, file) {
        this.failure = failure;
        this.node = failure.node;
        this.sibling = failure.sibling;
        this.parent = failure.parent;
        this.range = failure.range;
        this.type = utils.FailureType.COLLISION;
        this.visitedNodes = new Set();
        this.overlapping = failure.overlapping;
        this.file = file;
        this.faultyCSSProperties = [];
        this.collisionDirection = failure.horizontalOrVertical;
        this.directionAxis = failure.direction;   // left, right, top, bottom
    }

    localizeFaultyProperties(node, parent, isParent = false) {
        if (!isParent) {
            let childDefinedStyles = node.cssNode.developerCssProperties;        // explicitly defined by developer

            let childComputedStyles = node.cssNode.computedStyles;
            // let parentComputedStyles = parent.cssNode.computedStyles;

            if (this.collisionDirection == 'horizontal') {
                this.localizeForHorizontal(node, childDefinedStyles, childComputedStyles);
            } else if (this.collisionDirection == 'vertical') {
                this.localizeForVertical(node, childDefinedStyles, childComputedStyles);
            }
        } else { // do not check height or width or margin for the parent
            let childDefinedStyles = node.cssNode.developerCssProperties;
            if (this.collisionDirection == 'horizontal') {
                for (let property in childDefinedStyles) {
                    if (property == 'padding-left' && childComputedStyles[property] != "0px" || property == 'padding-right' && childComputedStyles[property] != "0px") {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                    }
                    if (property == 'display' && childDefinedStyles[property].includes('flex')) {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                    }
                }
                if (childDefinedStyles.includes('display')) {
                    if (childDefinedStyles['display'].includes('flex')) {
                        if (!childDefinedStyles.includes('flex-wrap') && childComputedStyles['flex-wrap'] != 'wrap') {
                            this.faultyCSSProperties.push({'element': node.xpath, 'property': `'flex-wrap' missing`, 'value': 'wrap'});
                        }
                    }
                }
            }
            if (this.collisionDirection == 'vertical') {
                for (let property in childDefinedStyles) {
                    if (property == 'padding-top' && childComputedStyles[property] != "0px" || property == 'padding-bottom' && childComputedStyles[property] != "0px") {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                    }
                }
            }
        }
    }

    localizeForHorizontal(node, childDefinedStyles, childComputedStyles) {
        for (let property in childDefinedStyles) {
            // checking computed width as if it is greater, then it means developer has defined it explicitly
            if (property == 'width' && (childDefinedStyles[property] != 'max-content' || childDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'margin-right' && childComputedStyles[property] != "0px" || property == 'padding-right' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'margin-left' && childComputedStyles[property] != "0px" || property == 'padding-left' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'font-size') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
        }
    }

    localizeForVertical(node, childDefinedStyles, childComputedStyles) {
        for (let property in childDefinedStyles) {
            if (property == 'height' && (childDefinedStyles[property] != 'max-content' || childDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'margin-bottom' && childComputedStyles[property] != "0px" || property == 'padding-bottom' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'margin-top' && childComputedStyles[property] != "0px" || property == 'padding-top' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'font-size' && childDefinedStyles[property] != 'inherit') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childComputedStyles[property]});
            }
        }
    }

    isLayoutResponsible(sibling, node) {
        if (this.collisionDirection == 'horizontal') {
            if (this.directionAxis == 'right') {
                if (node.rect.isToMyLeft(sibling.rect)) {
                    return true;
                }
                return false;
            }
            if (this.directionAxis == 'left') {
                if (node.rect.isToMyRight(sibling.rect)) {
                    return true;
                }
                return false;
            }
        }
        if (this.collisionDirection == 'vertical') {
            if (this.directionAxis == 'bottom') {
                if (node.rect.isAboveMe(sibling.rect)) {
                    return true;
                }
                return false;
            }
            if (this.directionAxis == 'top') {
                if (node.rect.isBelowMe(sibling.rect)) {
                    return true;
                }
                return false;
            }
        }
    }

    searchLayer() {
        // check the affected node first
        this.localizeFaultyProperties(this.node, this.sibling, false);

        // if no style found, check it's children
        for (let edge of this.node.childrenEdges) {
            let nodeChild = edge.child;
            this.localizeFaultyProperties(nodeChild, this.node, false);
        }

        // Now check the sibling
        this.localizeFaultyProperties(this.sibling, null, true);

        if (this.node.parentEdges.length != 0) {
            for (let edge of this.node.parentEdges) {
                if (this.immediateParent == null) {
                    this.immediateParent = edge.getParent();
                } else {
                    if (this.immediateParent.xpath.length < edge.getParent().xpath.length) {
                        this.immediateParent = edge.getParent();
                    }
                }
            }
        }

        // if no style found, check the node's siblings
        this.localizeSiblingChilds(this.immediateParent)

        this.faultyCSSProperties.sort((a, b) => {
            const getNumericValue = (str) => {
              const match = str.match(/(\d+(\.\d+)?)/);
              return match ? parseFloat(match[0]) : 0;
            };

            // non value properties are kept at first
            if (a['property'] === 'display' && b['property'] !== 'display') return -1;
            if (b['property'] === 'display' && a['property'] !== 'display') return 1;

            if (a['property'] === 'float' && b['property'] !== 'float') return -1;
            if (b['property'] === 'float' && a['property'] !== 'float') return 1;
          
            const aValue = getNumericValue(a['value']);
            const bValue = getNumericValue(b['value']);
          
            if (aValue !== bValue) {
                return aValue < bValue ? 1 : -1;
            }

            return 0;
          });

        for (let faulty of this.faultyCSSProperties) {
            this.printLocalization(faulty);
        }
    }

    localizeSiblingChilds(parent) {
        if (!parent.childrenEdges || parent.childrenEdges.length == 0) return;

        for (let edge of parent.childrenEdges) {    // we have to check where the sibling is, if it is on the left or right, or top or bottom. Filter on the basis of collision direction
            let sibling = edge.getChild();
            if (this.visitedNodes.has(sibling)) {
                continue;
            }
            this.visitedNodes.add(sibling);
            if (this.isLayoutResponsible(sibling, this.node)) { 
                this.localizeFaultyProperties(sibling, parent, false);
                this.localizeSiblingChilds(sibling);
            }
        }
    }

    printLocalization(faultyProperty) {
        let text = 'Type: ' + this.type + ' Range:' + this.range.toString() + ' Parent:' + this.parent.xpath + ' Child: ' + this.node.xpath;
        utils.printToFile(this.file, text);
        text = '|  |  |--[ Property: ' + faultyProperty['property'] + ' ]';
        utils.printToFile(this.file, text);
        text = '|  |  |--[ Value: ' + faultyProperty['value'] + ' ]';
        utils.printToFile(this.file, text);
        text = '|  |  |--[ Element: ' + faultyProperty['element'] + ' ]';
        utils.printToFile(this.file, text);
    }
}

module.exports = CollisionLocalize;