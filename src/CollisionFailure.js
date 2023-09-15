const Failure = require("./Failure");
const utils = require("./utils");

class CollisionFailure extends Failure {
    constructor(node, sibling, parent, range, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.sibling = sibling;
        this.parent = parent;
        this.range = range;
        this.type = utils.FailureType.COLLISION;
        this.outputDirectory = outputDirectory;
        if (settings.humanStudy === true)
            this.setupHumanStudyData();
    }
}

module.exports = CollisionFailure;