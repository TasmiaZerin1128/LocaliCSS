const RBush = require('rbush');
const { Range } = require('./Range.js');
const RLGNode = require('./RLGNode.js');
const Rectangle = require('./Rectangle.js');
const settings = require('../settings.js');

const tolerance = settings.tolerance;

class RLG {
    constructor(outputDir, webpage, run) {
        this.ranges = new Range();
        this.root = undefined;
        this.map = new Map();
        this.nodeWithFailures = [];
        this.collisionRepairStats = new RepairStatistics();
        this.protrusionRepairStats = new RepairStatistics();
        this.viewportRepairStats = new RepairStatistics();
        this.allRepairStats = new RepairStatistics();
        this.outputDirectory = outputDir;
        this.webpage = webpage;
        this.run = run;
    }

    // Returns the RLG Node if it exists, undefined otherwise
    getRLGNode(xpath) {
        return this.map.get(xpath);
    }

    /**
     * Add passed in DOM instance to the RLG.
     * @param {DOM} dom the DOM to integrate into the RLG
     * @param {number} viewport The viewport where the dom is extracted.
     */

    extractRLG(dom, viewport) {
        // let rlg = this;
        let domRectangles = dom.rbush.all();
        for(let rect of domRectangles){
            if(rect.xpath === '/HTML/BODY'){
                rect.maxY = rect.realMaxY = Infinity;
                rect.height = rect.realHeight = Infinity;
                rect.bottom = rect.realBottom = Infinity;
                break;
            }
        }
        dom.rbush = new RBush();
        dom.rbush.load(domRectangles); // reload the rbush with the new rectangles
        //set Parent
        for(let rect of domRectangles){
            let rlgNode = this.getRLGNode(rect.xpath);
            if(rlgNode === undefined){
                rlgNode = new RLGNode(rect, this, this.outputDirectory, this.webpage, this.run);
                this.map.set(rlgNode.xpath, rlgNode);
            }
            rlgNode.addViewport(viewport);
            let intersectingRectangles = dom.rbush.search(rect);
            let intersectionTypes = this.findIntersectionTypes(intersectingRectangles, rect);

            let parent = undefined;
            if (intersectionTypes.containers.length > 0) {
                let candidateParents = this.findCandidateContainers(intersectionTypes.containers, rect);
                parent = this.findParent(candidateParents, rect);
            }

            if (parent !== undefined) {  //if has parent
                if (parent.children === undefined) {
                    parent.children = [];
                }
                //Prevent circular PC edges
                let circular = false;
                let traversalStack = [];
                traversalStack.push(rect);
                while (traversalStack.length > 0) {
                    let tempRect = traversalStack.shift();
                    if (tempRect.xpath === parent.xpath) {
                        circular = true;
                        // Circular avoided
                        break;
                    }
                    if (tempRect.children !== undefined) {
                        for (let child of tempRect.children)
                            traversalStack.push(child);
                    }
                }
                if (!circular)
                    parent.children.push(rect);
            }
        }
        //set overlap between siblings(between the contained nodes)
        for (let rect of domRectangles) {
            let parentRectangle = rect;
            let parentNode = this.getRLGNode(parentRectangle.xpath);
            let siblingsRBush = new RBush();
            if (parentRectangle.children !== undefined) {
                siblingsRBush.load(parentRectangle.children);
                
            }
        }
    }

    /**
     * Does the first parameter rectangle contain the second parameter rectangle.
     * @param {Rectangle} rectangle The rectangle in to check if it contains otherRectangle.
     * @param {*} otherRectangle The rectangle that is to be checked if it is contained.
     */
    isContained(rect, otherRect) {
        if (otherRect.xpath === '/HTML/BODY') // no element contains the body element
            return false;
        let tol = 0;
        if (tolerance.protrusion !== undefined && tolerance.protrusion > 0){
            tol = tolerance.protrusion;
        }
        if (rect.xpath === '/HTML/BODY') { //ignore bottom
            if (rect.minX - tol <= otherRect.minX
                && rect.maxX + tol >= otherRect.minX
                && rect.minY - tol <= otherRect.minY)
                return true;
        } else {
            if (rect.minX - tol <= otherRect.minX
                && rect.maxX + tol >= otherRect.minX
                && rect.minY - tol <= otherRect.minY
                && rect.maxY + tol >= otherRect.maxY)
                return true;
        }
        return false;
    }

    /**
     * Check if the otherRectangle passed in the parameter is within tolerance area of 
     * rectangle. Returning true if the sides of the passed in otherRectangle are in the 
     * area between rectangle-tolerance and rectangle+tolerance.
     * @param {Rectangle} rect A rectangle to that will use the tolerance.
     * @param {Rectangle} otherRect A rectangle to inspect against that will not use tolerance.
     */
    isWithinProtrusionTolerance(rect, otherRect) {
        let tol = 0;
        if (tolerance.protrusion != undefined && tolerance.protrusion > 0)
            tol = tolerance.protrusion;
        if (rect.xpath === "/HTML/BODY") { //ignore bottom area
            if ((rect.minX - tol) <= otherRect.minX && (recte.minX + tol) >= otherRect.minX &&
                (rect.maxX - tol) <= otherRect.maxX && (rect.maxX + tol) >= otherRect.maxX &&
                (rect.minY - tol) <= otherRect.minY && (rect.minY + tol) >= otherRect.minY)
                return true;
        } else {
            if ((rect.minX - tol) <= otherRect.minX && (rect.minX + tol) >= otherRect.minX &&
                (rect.maxX - tol) <= otherRect.maxX && (rect.maxX + tol) >= otherRect.maxX &&
                (rect.minY - tol) <= otherRect.minY && (rect.minY + tol) >= otherRect.minY &&
                (rect.maxY - tol) <= otherRect.maxY && (rect.maxY + tol) >= otherRect.maxY)
                return true;
        }

        return false;
    }

    /**
     * Returns an object with 3 rectangle arrays obj.containers =[], obj.contained =[],
     * obj.others =[].
     * @param {[Rectangle]} rectangles Array of rectangle object used by RBush library.
     * @param {Rectangle} targetRect The rectangle to find intersection relationships for.
     */
    findIntersectionTypes(rectangles, targetRect) {
        let tol = 0;
        if (tolerance.protrusion !== undefined && tolerance.protrusion > 0){
            tol = tolerance.protrusion;
        }
        let result = {};
        result.containers = [];
        result.contained = [];
        result.others = [];
        let domNodeIsInList = false;
        for (let intersectingRect of rectangles) {
            if (intersectingRect.xpath !== targetRect.xpath){ // No comparison with self
                if (this.isWithinProtrusionTolerance(targetRect, intersectingRect)){
                    if (targetRect.xpath.includes(intersectingRect.xpath + '/')) { //rect.xpath is a sub-node of domNode.xpath
                        result.containers.push(intersectingRect);
                    } else if (intersectingRect.xpath.includes(targetRect.xpath + '/')) { //rect.xpath is a super-node of domNode.xpath
                        result.contained.push(intersectingRect);
                    } else if (targetRect.xpath.length <  intersectingRect.xpath.length) {
                        result.contained.push(intersectingRect);
                    } else if (targetRect.xpath.length >  intersectingRect.xpath.length) {
                        result.containers.push(intersectingRect);
                    } else {
                        let sortedByXpath = [targetRect.xpath, intersectingRect.xpath].sort();
                        if (sortedByXpath[0] === intersectingRect.xpath) {
                            result.containers.push(intersectingRect);
                        } else {
                            result.contained.push(intersectingRect);
                        }
                    }
                } else if (this.isContained(intersectingRect, targetRect)) { //rect is a container
                    result.containers.push(intersectingRect);
                } else if (this.isContained(targetRect, intersectingRect)) { //rect is contained
                    result.contained.push(intersectingRect);
                } else {
                    result.others.push(intersectingRect);
                }
            } else {
                domNodeIsInList = true;
            }
        }
        if (!domNodeIsInList) {
            throw new Error('The list of rectangles does not have the DOMnode as part of it');
        }
        return result;
    }

}

module.exports = RLG;