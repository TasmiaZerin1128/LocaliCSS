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
}

module.exports = PCEdge;