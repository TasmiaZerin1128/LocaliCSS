const RLGEdge = require('./RLGEdge.js');

class ContainerEdge extends RLGEdge {
    constructor(contained, container) {
        super(contained, container);
        this.contained = this.node1;
        this.container = this.node2;
    }
}
module.exports = ContainerEdge;