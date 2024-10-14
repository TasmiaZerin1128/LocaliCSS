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

    localizeFaultyProperties(node) {
        let nodeDefinedStyles = node.cssNode.developerCssProperties;        // explicitly defined by developer

        let nodeComputedStyles = node.cssNode.computedStyles;
        // let parentComputedStyles = parent.cssNode.computedStyles;

        if (this.collisionDirection == 'horizontal') {
            this.localizeForHorizontal(node, nodeDefinedStyles, nodeComputedStyles);
        } else if (this.collisionDirection == 'vertical') {
            this.localizeForVertical(node, nodeDefinedStyles, nodeComputedStyles);
        }
    }

    localizeForHorizontal(node, nodeDefinedStyles, nodeComputedStyles) {
        for (let property in nodeDefinedStyles) {
            if (property == 'width' && (nodeDefinedStyles[property] != 'max-content' || nodeDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'max-width' && (nodeDefinedStyles[property] == 'none' || nodeDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'position' && (nodeDefinedStyles[property] == 'absolute' || nodeDefinedStyles[property] == 'fixed')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'margin-right' && nodeComputedStyles[property] != "0px" || property == 'padding-right' && nodeComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'margin-left' && nodeComputedStyles[property] != "0px" || property == 'padding-left' && nodeComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
        }
    }

    localizeForVertical(node, nodeDefinedStyles, nodeComputedStyles) {
        for (let property in nodeDefinedStyles) {
            if (property == 'height' && (nodeDefinedStyles[property] != 'max-content' || nodeDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'max-height' && (nodeDefinedStyles[property] == 'none' || nodeDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'position' && (nodeDefinedStyles[property] == 'absolute' || nodeDefinedStyles[property] == 'fixed')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'margin-bottom' && nodeComputedStyles[property] != "0px" || property == 'padding-bottom' && nodeComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'margin-top' && nodeComputedStyles[property] != "0px" || property == 'padding-top' && nodeComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': nodeComputedStyles[property]});
            }
        }
    }

    searchLayer() {
        // check the affected node first
        this.localizeFaultyProperties(this.node);

        // Now check the sibling
        this.localizeFaultyProperties(this.sibling);

        // Now check the parent
        let parentDefinedStyles = this.parent.cssNode.developerCssProperties;
        let parentComputedStyles = this.parent.cssNode.computedStyles;
        if (parentDefinedStyles.includes('display')) {   // if parent includes display 'flex', or 'inline-flex' but does not have flex-wrap: wrap
            if (parentDefinedStyles['display'].includes('flex')) {
                if (!parentDefinedStyles.includes('flex-wrap') && parentComputedStyles['flex-wrap'] != 'wrap') {
                    this.faultyCSSProperties.push({'element': this.parent.xpath, 'property': `'flex-wrap' missing`, 'value': 'wrap'});
                }
            }
        }

        this.localizeChilds(this.node);
        this.localizeChilds(this.sibling);

        this.faultyCSSProperties.sort((a, b) => {
            const getNumericValue = (str) => {
              const match = str.match(/(\d+(\.\d+)?)/);
              return match ? parseFloat(match[0]) : 0;
            };

            // non value properties are kept at first
            if (a['property'] === 'position' && b['property'] !== 'position') return -1;
            if (b['property'] === 'position' && a['property'] !== 'position') return 1;

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
        let text = '---------------------------------------------';
        utils.printToFile(this.file, text);
    }

    localizeChilds(parent) {
        if (!parent.childrenEdges || parent.childrenEdges.length == 0) return;

        for (let edge of parent.childrenEdges) {
            let child = edge.getChild();
            if (this.visitedNodes.has(child)) {
                continue;
            }
            this.visitedNodes.add(child);
            this.localizeFaultyProperties(child);
            this.localizeChilds(child);
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
        text = '-----------------';
        utils.printToFile(this.file, text);
    }
}

module.exports = CollisionLocalize;