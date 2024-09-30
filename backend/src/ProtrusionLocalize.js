const settings = require('../settings.js');
const utils = require('./utils.js');
const Rectangle = require('./Rectangle.js');

class ProtrusionLocalize {
    constructor(failure, outputDirectory) {
        this.failure = failure;
        this.node = failure.node;
        this.parent = failure.parent;
        this.newParent = failure.newParent;
        this.range = failure.range;
        this.type = utils.FailureType.PROTRUSION;
        this.outputDirectory = outputDirectory;
        this.faultyCSSProperties = [];
    }

    localizeFaultyProperties(node, parent, isParent = false) {
        if (!isParent) {
            let type = this.failure.horizontalOrVertical;
            let childDefinedStyles = node.cssNode.developerCssProperties;
            let parentDefinedStyles = parent.cssNode.developerCssProperties;

            let childComputedStyles = node.cssNode.computedStyles;
            let parentComputedStyles = parent.cssNode.computedStyles;

            for (let property in childDefinedStyles) {
                if (property == 'width' && childComputedStyles[property] > parentComputedStyles[property]) {
                    this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                }
                if (property == 'height' && childComputedStyles[property] > parentComputedStyles[property]) {
                    this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                }
                if (property == 'margin-left' || property == 'margin-right' || property == 'margin-top' || property == 'margin-bottom') {
                    this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                }
                if (property == 'padding' || property == 'padding-left' || property == 'padding-right' || property == 'padding-top' || property == 'padding-bottom') {
                    this.faultyCSSProperties.push({'element': node.xpath, 'property': property});
                }
            }
        } else {
            // add rules for the paren't properties
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
        this.localizeFaultyProperties(this.node, null, true);

        // if no style found, check the node's siblings
        for (let edge of this.parent.childrenEdges) {
            let sibling = edge.child;
            this.localizeFaultyProperties(sibling, this.parent, false);
        }

        for (let faulty of this.faultyCSSProperties) {
            console.log(faulty);
        }
    }
}

module.exports = ProtrusionLocalize;