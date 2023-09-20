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
const utils = require("./utils");
const SmallRangeFailure = require("./SmallRangeFailure");
const CollisionFailure = require("./CollisionFailure");

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

    getRowNodesAtViewport(viewport) {
        let aboveXPaths = [];
        let belowXPaths = [];
        let rowNodes = [];
        for (let aboveEdge of this.aboveMeEdges) {
            if (aboveEdge.ranges.inRanges(viewport))
                aboveXPaths.push(aboveEdge.above.xpath);
        }
        for (let belowEdge of this.belowMeEdges) {
            if (belowEdge.ranges.inRanges(viewport))
                belowXPaths.push(belowEdge.below.xpath);
        }
        for (let rightEdge of this.toMyRightEdges) {
            if (rightEdge.ranges.inRanges(viewport))
                if (!aboveXPaths.includes(rightEdge.right.xpath) && !belowXPaths.includes(rightEdge.right.xpath))
                    rowNodes.push(rightEdge.right);
        }
        for (let leftEdge of this.toMyLeftEdges) {
            if (leftEdge.ranges.inRanges(viewport))
                if (!aboveXPaths.includes(leftEdge.left.xpath) && !belowXPaths.includes(leftEdge.left.xpath))
                    rowNodes.push(leftEdge.left);
        }
        return rowNodes;
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

    // Detect collision in the passed in range
    detectCollision(firstNodeParentAtMax, firstNodeParentAtWider, secondNodeParentAtMax, secondNodeParentAtWider, overlapEdge, range) {
        if (firstNodeParentAtWider.xpath === firstNodeParentAtMax.xpath
            && secondNodeParentAtWider.xpath === secondNodeParentAtMax.xpath) {
                if (this.xpath === overlapEdge.sibling1.xpath) {
                    let alsoProtuding = false;
                    for (let protrusion of this.elementProtrusions) {
                        if (protrusion.node.xpath === this.xpath ||
                            protrusion.node.xpath === overlapEdge.sibling2.xpath) {
                                if (protrusion.range.isContaining(range)) {
                                    alsoProtuding = true;
                                    break;
                                }
                        }
                    }
                    if (!alsoProtuding) {
                        let failure = new CollisionFailure(this, overlapEdge.sibling2, firstNodeParentAtMax, range, this.outputDirectory, this.webpage, this.run);
                        this.elementCollisions.push(failure);
                    }
                }
            }

    }

    detectSmallRange() {
        const alignment = utils.alignment;

        let siblingAlignments = [this.aboveMeEdges, this.belowMeEdges, this.toMyLeftEdges, this.toMyRightEdges, this.overlapEdges];
        let names = [alignment.ABOVE, alignment.BELOW, alignment.LEFT, alignment.RIGHT, alignment.OVERLAP];

        for (let i = 0; i < siblingAlignments.length; i++) {
            let checkingAlignment = siblingAlignments[i];
            let name = names[i];
            let otherAlignments = [];
            let otherNames = [];

            for (let x = 0; x < siblingAlignments.length; x++) {
                if (x !== i) {
                    otherAlignments.push(siblingAlignments[x]);
                    otherNames.push(names[x]);
                }
            }

            for (let edge of checkingAlignment) {
                if (edge.node1.xpath === this.xpath) {
                    for (let range of edge.ranges.list) {
                        let set = [];
                        let setWider = [];
                        let setNarrower = [];
                        let possibleFailureRange = undefined;
                        if (range.length() <= settings.smallrangeThreshold) {
                            possibleFailureRange = range;
                            set.push(name);
                            for (let x = 0; x < otherAlignments.length; x++) {
                                let otherAlignment = otherAlignments[x];
                                let otherName = otherNames[x];
                                for (let otherEdge of otherAlignment)
                                    if (edge.hasTheSameNodes(otherEdge)) {
                                        for (let otherEdgeRange of otherEdge.ranges.list) {
                                            if (otherEdgeRange.isOverlappingWith(possibleFailureRange))
                                                set.push(otherName);
                                            if (otherEdgeRange.inRange(possibleFailureRange.min - 1))  //alignment exists at narrower viewport
                                                setNarrower.push(otherName);
                                            if (otherEdgeRange.inRange(possibleFailureRange.max + 1))   //alignment exists at wider viewport
                                                setWider.push(otherName);
                                        }
                                    }
                            }
                        }
                        if (setWider.length > 0 && setNarrower.length > 0) {
                            let prevDiff = utils.setDifference(setNarrower, set);
                            let diffPrev = utils.setDifference(set, setNarrower);
                            let nextDiff = utils.setDifference(setWider, set);
                            let diffNext = utils.setDifference(set, setWider);

                            if ((prevDiff.length + diffPrev.length) >= 2 && (nextDiff.length + diffNext.length) >= 2) {
                                if (!this.isSmallRangeReported(edge.node1, edge.node2, possibleFailureRange)) {
                                    let failure = undefined;
                                    if (edge.node1.xpath === this.xpath)
                                        failure = new SmallRangeFailure(edge.node1, edge.node2, possibleFailureRange, set, setNarrower, setWider, this.outputDirectory, this.webpage, this.run);
                                    else
                                        failure = new SmallRangeFailure(edge.node2, edge.node1, possibleFailureRange, set, setNarrower, setWider, this.outputDirectory, this.webpage, this.run);
                                    this.smallranges.push(failure);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    isSmallRangeReported(node, otherNode, range) {
        for (let sr of this.smallranges) {
            if (sr.range.getMinimum() == range.getMinimum() && sr.range.getMaximum() == range.getMaximum() &&
             ((sr.node.xpath === node.xpath && sr.sibling.xpath === otherNode.xpath) ||
             (sr.node.xpath === otherNode.xpath && sr.sibling.xpath === node.xpath))) {
                return true;
            }
        }
        return false;
    }

    detectWrapping(edges, direction) {
        let viewportInspected = [];
        for (let edge of edges) {
            for (let range of edge.ranges.list) {
                if (viewportInspected.includes(range.getMaximum())) {
                    continue;
                }
                let row = this.getRowNodesAtViewport(range.getWider());
                if (utils.isObjectsXPathInArrayOfObjects(edge[direction], row))
                    viewportInspected.push(range.getMaximum());
                else
                    continue;
                if (row.length >= settings.rowThreshold) {
                    let rowAfterWrapping = row[0].getRowNodesAtViewport(range.getMaximum());
                    rowAfterWrapping.unshift(row[0]);

                    if (rowAfterWrapping.length === row.length) {
                        let rowIntactPostWrapping = true;
                        for (let node of row) {
                            if (!utils.isObjectsXPathInArrayOfObjects(node, rowAfterWrapping)) {
                                rowIntactPostWrapping = false;
                                break;
                            }
                        }
                    }
                    if (rowIntactPostWrapping) {
                        let possibleRanges = [];
                        for (let edgeB of edges)
                            if (utils.isObjectsXPathInArrayOfObjects(edgeB[direction], row))
                                for (let possibleRange of edgeB.ranges.list)
                                    if (range.getMaximum() === possibleRange.getMaximum())
                                        possibleRanges.push(possibleRange);
                        if (possibleRanges.length === row.length) {
                            let failureRange = undefined;
                            for (let fRange of possibleRanges)
                                if (failureRange === undefined || failureRange.getMinimum() < fRange.getMinimum())
                                    failureRange = fRange;

                            let rowAtMinimum = row[0].getRowNodesAtViewport(range.getMinimum());
                            rowAtMinimum.unshift(row[0]);

                            if (row.length === rowAtMinimum.length) {
                                let rowIntactPostWrappingAtMinimum = true;
                                for (let node of row) {
                                    if (!utils.isObjectsXPathInArrayOfObjects(node, rowAtMinimum)) {
                                        rowIntactPostWrappingAtMinimum = false;
                                        break;
                                    }
                                }
                                if (rowIntactPostWrappingAtMinimum) {
                                    let wrapping = new WrappingFailure(this, row, failureRange, this.outputDirectory, this.webpage, this.run)
                                    this.wrappings.push(wrapping);
                                }
                            }
                        }

                    }
                }
            }
        }
    }

    async classifyFailures(driver, classificationFile, snapshotDirectory, bar) {
        for (let viewportProtrusion of this.viewportProtrusions) {
            await viewportProtrusion.classify(driver, classificationFile, snapshotDirectory, bar);
        }
        for (let protrusion of this.elementProtrusions) {
            await protrusion.classify(driver, classificationFile, snapshotDirectory, bar);
        }
        for (let collision of this.elementCollisions) {
            await collision.classify(driver, classificationFile, snapshotDirectory, bar);
        }
        for (let wrapping of this.wrappings) {
            await wrapping.classify(driver, classificationFile, snapshotDirectory, bar);
        }
        for (let smallrange of this.smallranges) {
            await smallrange.classify(driver, classificationFile, snapshotDirectory, bar);
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
    }
}

module.exports = RLGNode;