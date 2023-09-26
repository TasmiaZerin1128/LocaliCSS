const RLGEdge = require('./RLGEdge.js');

class OverlapEdge extends RLGEdge {
    
    //Creates an RLG edge between overlapping siblings.
    constructor(sibling1, sibling2) {
        super(sibling1, sibling2);
        this.sibling1 = this.node1;
        this.sibling2 = this.node2;

        this.collisionFailure = false;
        this.collisionFailureRanges = undefined;
        this.protrusionFailureRanges = undefined;
        this.siblingOneIsAProtrusion = false;
        this.siblingTwoIsAProtrusion = false;
    }
}

module.exports = OverlapEdge;