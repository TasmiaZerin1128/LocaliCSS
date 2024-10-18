const settings = require('../settings.js');
const utils = require('./utils.js');
const path = require('path');

class ProtrusionLocalize {
    constructor(failure, file) {
        this.failure = failure;
        this.node = failure.node;
        this.parent = failure.parent;
        this.newParent = failure.newParent;
        this.immediateParent = null;
        this.visitedNodes = new Set();
        this.visitedParents = new Set();
        this.range = failure.range;
        this.type = utils.FailureType.PROTRUSION;
        this.file = file;
        this.faultyCSSProperties = [];
        this.protrusionDirection = failure.horizontalOrVertical;
        this.directionAxis = failure.direction;   // left, right, top, bottom
    }

    localizeFaultyProperties(node, parent, isParent = false) {
        try {

            let childDefinedStyles = node.cssNode.developerCssProperties;        // explicitly defined by developer

            let childComputedStyles = node.cssNode.computedStyles;
            // let parentComputedStyles = parent.cssNode.computedStyles;

            if (!isParent) {
                if (this.protrusionDirection == 'horizontal') {
                    this.localizeForHorizontal(node, childDefinedStyles, childComputedStyles);
                } else if (this.protrusionDirection == 'vertical') {
                    this.localizeForVertical(node, childDefinedStyles, childComputedStyles);
                }
            } else { // do not check height or width or margin for the parent
                if (this.protrusionDirection == 'horizontal') {
                    for (let property in childDefinedStyles) {
                        if (property == 'padding-left' && childComputedStyles[property] != "0px" || property == 'padding-right' && childComputedStyles[property] != "0px") {
                            this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                        }
                        if (property == 'display' && childDefinedStyles[property].includes('flex')) {
                            this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                        }
                    }
                    if (childDefinedStyles.includes('display')) {   // if child includes display 'flex', or 'inline-flex' but does not have flex-wrap: wrap
                        if (childDefinedStyles['display'].includes('flex')) {
                            if (!childDefinedStyles.includes('flex-wrap') && childComputedStyles['flex-wrap'] != 'wrap') {
                                this.faultyCSSProperties.push({'element': node.xpath, 'property': `'flex-wrap' missing`, 'value': 'wrap'});
                            }
                        }
                    }
                }
                if (this.protrusionDirection == 'vertical') {
                    for (let property in childDefinedStyles) {
                        if (property == 'padding-top' && childComputedStyles[property] != "0px" || property == 'padding-bottom' && childComputedStyles[property] != "0px") {
                            this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
                        }
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
            if ((property == 'margin-right' && childComputedStyles[property] != "0px" && childComputedStyles[property] != "auto") || (property == 'padding-right' && childComputedStyles[property] != "0px" && childComputedStyles[property] != "auto")) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if ((property == 'margin-left' && childComputedStyles[property] != "0px" && childComputedStyles[property] != "auto") || (property == 'padding-left' && childComputedStyles[property] != "0px" && childComputedStyles[property] != "auto")) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'font-size') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if ((property == 'border-right-width' && childComputedStyles[property] != "0px") || (property == 'border-left-width' && childComputedStyles[property] != "0px")) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
        }
    }

    localizeForVertical(node, childDefinedStyles, childComputedStyles) {
        for (let property in childDefinedStyles) {
            if (property == 'height' && (childDefinedStyles[property] != 'max-content' || childDefinedStyles[property] != '100%')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'position' && (childDefinedStyles[property] == 'absolute' || childDefinedStyles[property] == 'fixed')) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'margin-bottom' && childComputedStyles[property] != "0px" || property == 'padding-bottom' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'margin-top' && childComputedStyles[property] != "0px" || property == 'padding-top' && childComputedStyles[property] != "0px") {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'font-size' && childDefinedStyles[property] != 'inherit') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if (property == 'float') {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
            if ((property == 'border-topt-width' && childComputedStyles[property] != "0px") || (property == 'border-bottom-width' && childComputedStyles[property] != "0px")) {
                this.faultyCSSProperties.push({'element': node.xpath, 'property': property, 'value': childDefinedStyles[property]});
            }
        }
    }

    isLayoutResponsible(sibling, node) {
        if (this.protrusionDirection == 'horizontal') {
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
        if (this.protrusionDirection == 'vertical') {
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
        this.localizeFaultyProperties(this.node, this.parent, false);

        // if no style found, check it's children
        for (let edge of this.node.childrenEdges) {
            let nodeChild = edge.child;
            this.localizeFaultyProperties(nodeChild, this.node, false);
        }

        // Now check the parent
        this.localizeFaultyProperties(this.parent, null, true);

        // find the immediate parent if it is not the same as the parent
        this.immediateParent = this.findImmediateParent(this.node);

        // if parent and immediate parent are not same, check from the immediate until the parent
        if (this.immediateParent.xpath.length > this.parent.xpath.length) {
            this.localizeIntermediateParents(this.immediateParent);
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

            if (a['property'] === 'position' && a['element'] === this.node.xpath && b['property'] !== 'position') return -1;
            if (b['property'] === 'position' && b['element'] === this.node.xpath && a['property'] !== 'position') return 1;

            if (a['property'] === 'float' && a['element'] === this.node.xpath && b['property'] !== 'float') return -1;
            if (b['property'] === 'float' && b['element'] === this.node.xpath && a['property'] !== 'float') return 1;
          
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

    localizeIntermediateParents(parent) {
        if (this.visitedParents.has(parent)) return;
        this.visitedParents.add(parent);
        if (parent.xpath <= this.parent.xpath || parent == null) return;
        console.log('immediate: ' + parent.xpath + ' parent: ' + this.parent.xpath);

        this.localizeFaultyProperties(parent, null, false);
        parent = this.findImmediateParent(parent);
        if (parent != null) this.localizeIntermediateParents(parent);
    }

    localizeSiblingChilds(parent) {
        if (!parent.childrenEdges || parent.childrenEdges.length == 0) return;

        for (let edge of parent.childrenEdges) {    // we have to check where the sibling is, if it is on the left or right, or top or bottom. Filter on the basis of protrusion direction
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

    findImmediateParent(node) {
        let immediateParent = null;
        if (node.parentEdges.length != 0) {
            for (let edge of node.parentEdges) {
                if (edge.getParent().xpath == this.node.xpath) {
                    continue;
                }
                if (immediateParent == null) {
                    immediateParent = edge.getParent();
                } else {
                    if (edge.getParent().xpath.length > immediateParent.xpath.length) {
                        immediateParent = edge.getParent();
                    }
                }
            }
        }
        return immediateParent;
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

module.exports = ProtrusionLocalize;