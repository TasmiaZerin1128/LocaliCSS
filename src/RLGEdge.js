const { Ranges } = require("./Range");

class RLGEdge {
    // Links two RLG nodes with this edge
    constructor(node1, node2) {
        this.node1 = node1;
        this.node2 = node2;
        this.ranges = new Ranges();
    }

    //Adds a viewport where this edge is observed
    addViewport(viewport) {
        this.ranges.addValue(viewport);
    }
}

module.exports = RLGEdge;