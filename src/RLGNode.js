const { Ranges } = require("./Range");

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
}

module.exports = RLGNode;