const RLGEdge = require("./RLGEdge");
const { Ranges } = require("./Range");

class PCEdge extends RLGEdge {
    constructor(parent, child) {
        super(parent, child);
        this.parent = this.node1;
        this.child = this.node2;

        this.leftJustifiedRanges = new Ranges();
        this.rightJustifiedRanges = new Ranges();
        this.topJustifiedRanges = new Ranges();
        this.bottomJustifiedRanges = new Ranges();
        this.horizontallyCenterJustifiedRanges = new Ranges();
        this.verticallyCenterJustifiedRanges = new Ranges();

        this.firstProtrusionFailureRanges = undefined;
        this.firstProtrusionParentXPath = undefined;
        this.secondProtrusionFailureRanges = undefined;
        this.secondProtrusionParentXPath = undefined;
    } 

    printVerticallyCenterJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Vertically Center Justified Range ' + postfix + ': ' + this.verticallyCenterJustifiedRanges.toString() + ' ]');
    }
    printHorizontallyCenterJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Horizontally Center Justified Range ' + postfix + ': ' + this.horizontallyCenterJustifiedRanges.toString() + ' ]');
    }
    printBottomJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Bottom Justified Range ' + postfix + ': ' + this.bottomJustifiedRanges.toString() + ' ]');
    }
    printTopJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Top Justified Range ' + postfix + ': ' + this.topJustifiedRanges.toString() + ' ]');
    }
    printLeftJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Left Justified Range ' + postfix + ': ' + this.leftJustifiedRanges.toString() + ' ]');
    }
    printRightJustifiedRange(prefix = '', postfix = '') {
        console.log('|  |  |--[ ' + prefix + ' Right Justified Range ' + postfix + ': ' + this.rightJustifiedRanges.toString() + ' ]');
    }
    
    // Sets the parent RLGNode.
    setParent(node) {
        this.parent = node;
    }
    
    //Returns the parent of in this edge.
    getParent() {
        return this.parent;
    }
    
    // Sets the child RLGNode.
    setChild(node) {
        this.child = node;
    }
    
    // Returns the child of this edge.
    getChild() {
        return this.child;
    }
}

module.exports = PCEdge;