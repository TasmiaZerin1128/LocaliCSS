const { Ranges } = require("./Range");
const RepairStatistics = require('./RepairStatistics.js');
const PCEdge = require('./PCedge.js');
const OverlapEdge = require("./OverlapEdge");
const AboveBelowEdge = require("./AboveBelowEdge");
const RightLeftEdge = require("./RightLeftEdge");
const ContainerEdge = require("./ContainerEdge");
const ViewportFailure = require("./ViewportFailure");
const settings = require("../settings.js");
const ProtrusionFailure = require("./ProtrusionFailure");

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

    // Returns the parent node at the passed in viewport
    getParentAtViewport(viewport) {
        for (let parentEdge of this.parentEdges) {
            let parent = parentEdge.getParent();
            if (parentEdge.ranges.inRanges(viewport)) {
                return parent;
            }
        }
        return undefined;
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

    // Returns a list of parents at the passed in viewport
    getAncestorsAtViewport(viewport) {
        if (this.parentEdges.length === 0) {
            return [];
        } else {
            for (let parentEdge of this.parentEdges) {
                let parent = parentEdge.getParent();
                if (parentEdge.ranges.inRanges(viewport)) {
                    let ownAncestors = parent.getAncestorsAtViewport(viewport);
                    ownAncestors.push(parent.xpath);
                    return ownAncestors;
                }
            }
            return [];
        }
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

    // Check at the maximum point of protrusion range if the old parent is still a container
    isOldParentStillAContainer(rlgNodeContainer, range) {
        for (let containerEdge of this.containerEdges) {
            if (containerEdge.container.xpath == rlgNodeContainer.xpath) {
                if (containerEdge.ranges.inRanges(range.getMaximum())) {
                    return true;
                }
            }
        }
        return false;
    }

    /* 
     * Entry algorithm for detecting collisions and protrusions of this node
     * based on the overlap edges of this node.
     */
    detectOverlapBasedFailures() {
        for (let overlapEdge of this.overlapEdges) {
            for (let range of overlapEdge.ranges.list) {
                let maxViewport = range.getMaximum();
                let widerViewport = maxViewport + 1;
                let firstNodeParentAtWider = overlapEdge.node1.getParentAtViewport(widerViewport);
                let secondNodeParentAtWider = overlapEdge.node2.getParentAtViewport(widerViewport);
                let firstNodeParentAtMax = overlapEdge.node1.getParentAtViewport(maxViewport);
                let secondNodeParentAtMax = overlapEdge.node2.getParentAtViewport(maxViewport);
                if (firstNodeParentAtWider === undefined || secondNodeParentAtWider === undefined)
                    continue; // one of the elements is not contained in wider viewport
                if (settings.detectElementProtrusion)
                    this.detectProtrusion(overlapEdge, maxViewport, firstNodeParentAtMax, firstNodeParentAtWider, secondNodeParentAtMax, secondNodeParentAtWider, range);
                if (settings.detectElementCollision)
                    this.detectCollision(firstNodeParentAtMax, firstNodeParentAtWider, secondNodeParentAtMax, secondNodeParentAtWider, overlapEdge, range);
            }
        }
    }

    // Detect protrusion failures
    detectProtrusion(overlapEdge, maxViewport, firstNodeParentAtMax, firstNodeParentAtWider, secondNodeParentAtMax, secondNodeParentAtWider, range) {
        let ancestorsNode1 = overlapEdge.sibling1.getAncestorsAtViewport(maxViewport + 1);
        let ancestorsNode2 = overlapEdge.sibling2.getAncestorsAtViewport(maxViewport + 1);
        if (ancestorsNode2.includes(overlapEdge.sibling1.xpath)) {
            if (this.xpath === overlapEdge.sibling2.xpath) {
                // There must be a new parent to report protrusion
                if (secondNodeParentAtMax.xpath !== secondNodeParentAtWider.xpath) {
                    // Only report if old parent is not a container still
                    if (!this.isOldParentStillAContainer(secondNodeParentAtWider, range)) {
                        let failure = new ProtrusionFailure(this, overlapEdge.sibling1, range, secondNodeParentAtMax, this.outputDirectory, this.webpage, this.run);
                        overlapEdge.sibling2.elementProtrusions.push(failure);
                    }
                }
            }
        }
        if (ancestorsNode1.includes(overlapEdge.sibling2.xpath)) {
            if (this.xpath === overlapEdge.sibling1.xpath) {
                //There must be a new parent to report protrusion (not just an overlap)
                if (firstNodeParentAtMax.xpath !== firstNodeParentAtWider.xpath) {
                    //Only report if old parent is not a container still.
                    if (!this.isOldParentStillAContainer(firstNodeParentAtWider, range)) {
                        let failure = new ProtrusionFailure(this, overlapEdge.sibling2, range, firstNodeParentAtMax, this.outputDirectory, this.webpage, this.run);
                        overlapEdge.sibling1.elementProtrusions.push(failure);
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
        // if (settings.detectSmallRange)
        //     this.detectSmallRange();
        // if (settings.detectWrapping)
        //     this.detectWrapping(this.aboveMeEdges, 'above');
        console.log("Detection done");
    }
}

module.exports = RLGNode;