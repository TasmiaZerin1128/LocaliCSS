const { Ranges } = require("./Range");
const RepairStatistics = require('./RepairStatistics.js');
const PCEdge = require('./PCedge.js');
const OverlapEdge = require("./OverlapEdge");
const AboveBelowEdge = require("./AboveBelowEdge");
const RightLeftEdge = require("./RightLeftEdge");
const ContainerEdge = require("./ContainerEdge");

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

    /**
     * Adds a width/viewport to RLGEdge or creates an RLGEdge between the two RLGNodes. 
     * @param {RLGNode} container The contained node to add.
     * @param {Number} viewport The viewport where the edge relationship is observed.
     */
    addContainer(container, viewport) {
        let edge = this.updateEdge(container, this.containerEdges, viewport, false, true);
        if (edge === undefined) {
            edge = new ContainerEdge(this, container);
            edge.addViewport(viewport);
            this.containerEdges.push(edge);
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

    /**
     * Adds a width/viewport to overlap RLGEdge or creates an RLGEdge between the two RLGNodes. 
     */
    addOverlap(sibling, viewport) {
        let edge = this.updateEdge(sibling, this.overlapEdges, viewport, true);
        if (edge === undefined) {
            edge = new OverlapEdge(this, sibling);
            edge.addViewport(viewport);
            this.overlapEdges.push(edge);
            console.log(sibling);
            sibling.overlapEdges.push(edge);
        }
    }

    // Adds a width/viewport to above RLGEdge or creates an RLGEdge between the two RLGNodes. 
    addToAbove(sibling, viewport) {
        let edge = this.updateEdge(sibling, this.aboveMeEdges, viewport, false, false);
        if (edge === undefined) {
            edge = new AboveBelowEdge(sibling, this);
            edge.addViewport(viewport);
            this.aboveMeEdges.push(edge);
            sibling.belowMeEdges.push(edge);
        }
    }

    // Adds a width/viewport to below RLGEdge or creates an RLGEdge between the two RLGNodes.
    addToBelow(sibling, viewport) {
        let edge = this.updateEdge(sibling, this.belowMeEdges, viewport, false, true);
        if (edge === undefined) {
            edge = new AboveBelowEdge(this, sibling);
            edge.addViewport(viewport);
            this.belowMeEdges.push(edge);
            sibling.aboveMeEdges.push(edge);
        }
    }

    // Adds a width/viewport to right RLGEdge or creates an RLGEdge between the two RLGNodes.
    addToRight(sibling, viewport) {
        let edge = this.updateEdge(sibling, this.toMyRightEdges, viewport, false, false);
        if (edge === undefined) {
            edge = new RightLeftEdge(sibling, this);
            edge.addViewport(viewport);
            this.toMyRightEdges.push(edge);
            sibling.toMyLeftEdges.push(edge);
        }
    }

    // Adds a width/viewport to left RLGEdge or creates an RLGEdge between the two RLGNodes.
    addToLeft(sibling, viewport) {
        let edge = this.updateEdge(sibling, this.toMyLeftEdges, viewport, false, true);
        if (edge === undefined) {
            edge = new RightLeftEdge(sibling, this);
            edge.addViewport(viewport);
            this.toMyLeftEdges.push(edge);
            sibling.toMyRightEdges.push(edge);
        }
    }

    // Returns the top level parent node in the passed in viewport
    getTopParentAtViewport(viewport) {
        let parent = undefined;
        for (let parentEdge of this.parentEdges) {
            parent = parentEdge.getParent();
            if (parentEdge.ranges.inRanges(viewport)) {
                let grandParent = parent.getTopParentAtViewport(viewport);
                if (grandParent === undefined) {
                    return parent;
                } else {
                    return grandParent;
                }
            }
        }
        return parent;
    }

    // Detect Viewport Protrusion of this node
    detectViewportProtrusion(bodyNode) {
        if (this.xpath === bodyNode.xpath) {
            return;
        }
        let containedRanges = new Ranges();
        for (let parentEdge of this.parentEdges) {
            for (let range of parentEdge.ranges.list) {
                containedRanges.addRange(range);
            }
        }
        if (!containedRanges.isEmpty()) {
            let nonContainedRanges = this.ranges.butNotInRanges(containedRanges);
            if (!nonContainedRanges.isEmpty()) {
                for (let range of nonContainedRanges.list) {
                    if (containedRanges.inRanges(range.getWider())) {
                        let topParent = this.getTopParentAtViewport(range.getWider());
                        if (topParent.xpath === bodyNode.xpath) {
                            let failure = new ViewportFailure(this, bodyNode, range, this.outputDirectory, this.webpage, this.run);
                            this.viewportProtrusions.push(failure);
                        }
                    }
                }
            }
        }
    }

    hasFailures() {
        if (this.smallranges.length === 0 && this.elementCollisions.length === 0 && this.elementProtrusions.length === 0 && this.wrappings.length === 0 && this.viewportProtrusions.length === 0) {
            return false;
        } else {
            return true;
        }
    }

    // Detect the failures of this node
    detectFailures(bodyNode) {
        this.ranges.sortRangesDescending();
        if (settings.detectViewportProtrusion)
            this.detectViewportProtrusion(bodyNode);
        if (settings.detectElementCollision || settings.detectElementProtrusion)
            this.detectOverlapBasedFailures();
        if (settings.detectSmallRange)
            this.detectSmallRange();
        if (settings.detectWrapping)
            this.detectWrapping(this.aboveMeEdges, 'above');
        console.log("Detection done");
    }
}

module.exports = RLGNode;