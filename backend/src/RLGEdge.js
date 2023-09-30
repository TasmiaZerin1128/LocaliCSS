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

    sameAs(otherEdge) {
        return (this.node1.xpath === otherEdge.node1.xpath && this.node2.xpath === otherEdge.node2.xpath);
    }

    getOtherNode(xpath) {
        if (this.node1.xpath === xpath)
            return this.node2.xpath;
        else
            return this.node1.xpath;
    }

    differenceFirstNode(otherEdge, type = 'Node') {
        if (!this.ranges.equals(otherEdge.ranges)) {
            this.printFirstNode(Difference.CHANGED, Difference.FROM, type);
            otherEdge.printRange(Difference.TO);
            return true;
        }
        return false;
    }
    
    differenceSecondNode(otherEdge, type = 'Node') {
        if (!this.ranges.equals(otherEdge.ranges)) {
            this.printSecondNode(Difference.CHANGED, Difference.FROM, type);
            otherEdge.printRange(Difference.TO);
            return true;
        }
        return false;
    }
    
    printFirstNode(nodeLabel = '', rangeLabel = '', type = 'First Node') {
        if (nodeLabel === '')
            console.log('|  |--[ ' + type + ': ' + this.node1.xpath + ' ]');
        else
            console.log('|  |--[ ' + nodeLabel + ' ' + type + ': ' + this.node1.xpath + ' ]');
        this.printRange(rangeLabel);
        return true;
    }
    
    printSecondNode(nodeLabel = '', rangeLabel = '', type = 'Second Node') {
        if (nodeLabel === '')
            console.log('|  |--[ ' + type + ': ' + this.node2.xpath + ' ]');
        else
            console.log('|  |--[ ' + nodeLabel + ' ' + type + ': ' + this.node2.xpath + ' ]');

        this.printRange(rangeLabel);
        return true;
    }
    
    printRange(rangeLabel = '') {
        console.log('|  |  |--[ ' + rangeLabel + 'Range: ' + this.ranges.toString() + ' ]');
        return true;
    }
}

module.exports = RLGEdge;