const RLGEdge = require("./RLGEdge");

class RightLeftEdge extends RLGEdge {
    // Creates an RLG edge between above and below node
    constructor(right, left) {
        super(right, left);
        this.right = this.node1;
        this.left = this.node2;
    }
}

module.exports = RightLeftEdge;