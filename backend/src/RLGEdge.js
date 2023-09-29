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

    hasTheSameNodes(otherEdge) {
        return (this.node1.xpath === otherEdge.node1.xpath && this.node2.xpath === otherEdge.node2.xpath)
            || (this.node1.xpath === otherEdge.node2.xpath && this.node2.xpath === otherEdge.node1.xpath);
    }
}

module.exports = RLGEdge;