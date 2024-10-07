const settings = require('../settings.js');
const utils = require('./utils.js');
const path = require('path');

class ProtrusionLocalize {
    constructor(failure, file) {
        this.failure = failure;
        this.node = failure.node;
        this.parent = failure.parent;
        this.newParent = failure.newParent;
        this.range = failure.range;
        this.type = utils.FailureType.PROTRUSION;
        this.file = file;
        this.faultyCSSProperties = [];
    }

    localizeFaultyProperties(node, parent, isParent = false) {
        let type = this.failure.horizontalOrVertical;
        if (!isParent) {
            let childDefinedStyles = node.cssNode.developerCssProperties;        // explicitly defined by developer

            let childComputedStyles = node.cssNode.computedStyles;
            let parentComputedStyles = parent.cssNode.computedStyles;

            if (type == 'horizontal') {
                this.localizeForHorizontal(node, childDefinedStyles, childComputedStyles, parentComputedStyles);
            } else if (type == 'vertical') {
                this.localizeForVertical(node, childDefinedStyles, childComputedStyles, parentComputedStyles);
            }
        } else {
            let childDefinedStyles = node.cssNode.developerCssProperties;
            if (type == 'horizontal') {
                for (let property in childDefinedStyles) {
                    if (property == 'padding-left' || property == 'padding-right') {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                    }
                }
            }
            if (type == 'vertical') {
                for (let property in childDefinedStyles) {
                    if (property == 'padding-topt' || property == 'padding-bottom') {
                        this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                    }
                }
            }
        }
    }

    localizeForHorizontal(node, childDefinedStyles, childComputedStyles, parentComputedStyles) {
        let protrusionDirection = this.failure.direction;
        for (let property in childDefinedStyles) {
            // checking computed width as if it is greater, then it means developer has defined it explicitly
            if (property == 'width' && childComputedStyles[property] > parentComputedStyles[property]) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (protrusionDirection == 'left' && (property == 'margin-right' || property == 'padding-right')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (protrusionDirection == 'right' && (property == 'margin-left' || property == 'padding-left')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
        }
    }

    localizeForVertical(node, childDefinedStyles, childComputedStyles, parentComputedStyles) {
        let protrusionDirection = this.failure.direction;
        for (let property in childDefinedStyles) {
            if (property == 'height' && childComputedStyles[property] > parentComputedStyles[property]) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (protrusionDirection == 'top' && (property == 'margin-bottom' || property == 'padding-bottom')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (protrusionDirection == 'bottom' && (property == 'margin-top' || property == 'padding-top')) {
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

        // Now check the parent
        this.localizeFaultyProperties(this.parent, null, true);

        // if no style found, check the node's siblings
        for (let edge of this.parent.childrenEdges) {    // we have to check where the sibling is, if it is on the left or right, or top or bottom. Filter on the basis of protrusion direction
            let sibling = edge.child;
            this.localizeFaultyProperties(sibling, this.parent, false);
        }

        this.faultyCSSProperties.sort((a, b) => (a['value'] < b['value']) ? 1 : -1);

        for (let faulty of this.faultyCSSProperties) {
            this.printLocalization(faulty);
        }
    }

    printLocalization(faultyProperty) {
        let text = 'Type: ' + this.type + ' Range:' + this.range.toString() + ' Parent:' + this.parent.xpath + ' Child: ' + this.node.xpath;
        utils.printToFile(this.file, text);
        text = '|  |  |--[ Property: ' +faultyProperty['property'] + ' ]';
        utils.printToFile(this.file, text);
        text = '|  |  |--[ Element: ' + faultyProperty['element'] + ' ]';
        utils.printToFile(this.file, text);
    }
}

module.exports = ProtrusionLocalize;