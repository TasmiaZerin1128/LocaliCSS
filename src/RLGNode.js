const { Ranges } = require("./Range");
const RepairStatistics = require('./RepairStatistics.js');

class RLGNode {
     /**
     * Constructor to create RLGNode from a Rectangle object retrieved from RBush.
     * The rectangle object must contain the XPath.
     */
    constructor(rectangle, rlgPointer, outputDir, webpage, run) {
        if (rectangle === undefined || rectangle.xpath === undefined) {
            throw "Rectangle must take a defined rectangle with xpath.";
        }
        this.rlg = rlgPointer;
        this.outputDirectory = outputDir;
        this.webpage = webpage;
        this.run = run;
        this.parentEdges = []; //RLGEdges
        this.containerEdges = []; //Not for parent-child edges. Added to remove FP protrusions

        this.childrenEdges = [];
        this.overlapEdges = [];

        this.aboveMeEdges = [];
        this.belowMeEdges = [];
        this.toMyRightEdges = [];
        this.toMyLeftEdges = [];

        this.ranges = new Ranges();
        this.xpath = rectangle.xpath;

        this.elementCollisions = [];
        this.elementProtrusions = [];
        this.smallranges = [];
        this.wrappings = [];
        this.viewportProtrusions = [];

        this.collisionRepairStats = new RepairStatistics();
        this.protrusionRepairStats = new RepairStatistics();
        this.viewportRepairStats = new RepairStatistics();
    }

    //Adds a viewport where this node is observed
    addViewport(viewport) {
        this.ranges.addValue(viewport);
    }

    /**
     * Adds a width/viewport to RLGEdge or creates an RLGEdge between the two RLGNodes. 
     * @param {RLGNode} child The contained node to add.
     * @param {Number} viewport The viewport where the edge relationship is observed.
     */
    addChild(child, viewport) {
        let edge = this.updateEdge(child, this.childrenEdges, viewport, false, true);
        if (edge === undefined) {
            edge = new PCEdge(this, child);
            edge.addViewport(viewport);
            this.childrenEdges.push(edge);
            child.parentEdges.push(edge);
        }
        return edge;
    }

    updateEdge(node, edges, viewport, twoWay = true, thisFirst = true) {
        for (let edge of edges) {
            if (twoWay === true) {
                if ((edge.node1.xpath === node.xpath && edge.node2.xpath === this.xpath)
                    || (edge.node1.xpath === this.xpath && edge.node2.xpath === node.xpath)) {
                    edge.addViewport(viewport);
                    return edge;
                }
            } else if (thisFirst === true) {
                if (edge.node1.xpath === this.xpath && edge.node2.xpath === node.xpath) {
                    edge.addViewport(viewport);
                    return edge;
                }
            } else if (thisFirst === false) {
                if (edge.node1.xpath === node.xpath && edge.node2.xpath === this.xpath) {
                    edge.addViewport(viewport);
                    return edge;
                }
            }

        }
        return undefined;
    }
}

module.exports = RLGNode;