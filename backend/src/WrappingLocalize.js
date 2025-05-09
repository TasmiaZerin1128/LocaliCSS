const settings = require('../settings.js');
const utils = require('./utils.js');
const path = require('path');

class WrappingLocalize {
    constructor(failure, file) {
        this.failure = failure;
        this.node = failure.node;
        this.immediateParent = null;
        this.row = failure.row;
        this.range = failure.range;
        this.type = utils.FailureType.WRAPPING;
        this.visitedNodes = new Set();
        this.file = file;
        this.faultyCSSProperties = [];
    }

    localizeFaultyProperties(node, parent, isParent = false) {
        try {

            let childDefinedStyles = node.cssNode.developerCssProperties;        // explicitly defined by developer

            let childComputedStyles = node.cssNode.computedStyles;
            // let parentComputedStyles = parent.cssNode.computedStyles;

            if (!isParent) {
                this.localizeForHorizontal(node, childDefinedStyles, childComputedStyles);

            } else { // have to check width of the parent as it is viewport failure
                for (let property in childDefinedStyles) {
                    if (property == 'margin-left' && childComputedStyles[property] != "0px" || property == 'margin-right' && childComputedStyles[property] != "0px") {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                    }
                }
                if (childDefinedStyles.includes('display')) {   // if child includes display 'flex', or 'inline-flex' but does not have flex-wrap: wrap
                    if (childDefinedStyles['display'].includes('flex')) {
                        if (childDefinedStyles.includes('flex-wrap') && childComputedStyles['flex-wrap'] == 'wrap') {
                            this.faultyCSSProperties.push({'element': node.xpath, 'property': 'flex-wrap', 'value': childDefinedStyles['flex-wrap']});
                        }
                    } else {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': 'flex', 'value': 'missing'});
                    }
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
    }

    localizeForHorizontal(node, childDefinedStyles, childComputedStyles) {
        for (let property in childDefinedStyles) {
            // checking computed width as if it is greater, then it means developer has defined it explicitly
            if (property == 'width' && (childDefinedStyles[property] != 'max-content' || childDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'max-width' && (childDefinedStyles[property] == 'none' || childDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'position' && (childDefinedStyles[property] == 'absolute' || childDefinedStyles[property] == 'fixed')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'margin-right' && childComputedStyles[property] != "0px" || property == 'padding-right' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'margin-left' && childComputedStyles[property] != "0px" || property == 'padding-left' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'font-size') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
        }
    }

    searchLayer() {
        // check the affected node first
        this.localizeFaultyProperties(this.node, this.parent, false);

        // if no style found, check it's children
        for (let edge of this.node.childrenEdges) {
            let nodeChild = edge.child;
            this.localizeFaultyProperties(nodeChild, this.node, false);
        }

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

        // Now check the immediate parent
        this.localizeFaultyProperties(this.immediateParent, null, true);

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

    localizeSiblingChilds(parent) {
        if (!parent.childrenEdges || parent.childrenEdges.length == 0) return;

        for (let edge of parent.childrenEdges) {    // we have to check where the sibling is, if it is on the left or right, or top or bottom. Filter on the basis of protrusion direction
            let sibling = edge.getChild();
            if (this.visitedNodes.has(sibling)) {
                continue;
            }
            this.visitedNodes.add(sibling);
            this.localizeFaultyProperties(sibling, parent, false);
            this.localizeSiblingChilds(sibling);
        }
    }

    printLocalization(faultyProperty) {
        let text = 'Type: ' + this.type + ' Range:' + this.range.toString() + ' Node: ' + this.node.xpath;
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

module.exports = WrappingLocalize;