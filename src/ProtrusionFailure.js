const Failure = require('./Failure.js');
const settings = require('../settings.js');
const utils = require('./utils.js');

class ProtrusionFailure extends Failure {
    constructor(node, parent, range, newParent, outputDirectory, webpage, run) {
        super(webpage, run);
        this.node = node;
        this.parent = parent;
        this.newParent = newParent;
        this.range = range;
        this.type = utils.FailureType.PROTRUSION;
        this.outputDirectory = outputDirectory;
    }
}

module.exports = ProtrusionFailure;