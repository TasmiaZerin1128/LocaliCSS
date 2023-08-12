const RLGEdge = require("./RLGEdge");

class AboveBelowEdge extends RLGEdge {
    // Creates an RLG edge between above and below node
    constructor(above, below) {
        super(above, below);
        this.above = this.node1;
        this.below = this.node2;
    }
}

module.exports = AboveBelowEdge;