const RBush = require('rbush');
const { Range } = require('./Range.js');
const RLGNode = require('./RLGNode.js');
const Rectangle = require('./Rectangle.js');
const settings = require('../settings.js');
const RepairStatistics = require('./RepairStatistics.js');

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
        let rlg = this;
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
            let rlgNode = rlg.getRLGNode(rect.xpath);
            if(rlgNode === undefined){
                rlgNode = new RLGNode(rect, this, this.outputDirectory, this.webpage, this.run);
                this.map.set(rlgNode.xpath, rlgNode);
            }
            rlgNode.addViewport(viewport);
            console.log(JSON.stringify(rlgNode));
            let intersectingRectangles = dom.rbush.search(rect);
            for(let r of intersectingRectangles){
                console.log(JSON.parse(JSON.stringify(r)));
            }
            let intersectionTypes = rlg.findIntersectionTypes(intersectingRectangles, rect);
            console.log(JSON.stringify(intersectionTypes) + '\n');

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
                console.log(JSON.stringify(parent) + '\n\n');
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
        // for (let rect of domRectangles) {
        //     let parentRectangle = rect;
        //     let parentNode = this.getRLGNode(parentRectangle.xpath);
        //     let siblingsRBush = new RBush();
        //     if (parentRectangle.children !== undefined) {
        //         siblingsRBush.load(parentRectangle.children); //bulk insert all children (rectangles)
        //         for (let childRect of parentRectangle.children) {
        //             let childNode = this.getRLGNode(childRect.xpath);
        //             // get Parent - child edge
        //             let pcEdge = parentNode.addChild(childNode, viewport);
        //         }
                
        //     }
        // }
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
                && rect.maxX + tol >= otherRect.maxX
                && rect.minY - tol <= otherRect.minY)
                return true;
        } else {
            if (rect.minX - tol <= otherRect.minX
                && rect.maxX + tol >= otherRect.maxX
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
            if ((rect.minX - tol) <= otherRect.minX && (rect.minX + tol) >= otherRect.minX &&
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

    findCandidateContainers(containers, rectangle) {
        console.log(JSON.stringify(containers));
        // Find height and width of the tightest container
        let smallest = undefined;
        let smallestArea = undefined;
        for (let container of containers) {
            if (container.xpath === rectangle.xpath) {
                continue;
            }
            let area = container.width * container.height;
            if (smallest === undefined || smallestArea > area) {
                smallest = container;
                smallestArea = area;
            }
        }
        //Find other containers with tolerance applied.
        let parentTolerance = tolerance.equivalentParent;
        let candidateContainers = [smallest];
        for (let container of containers) {

            if (container.xpath === smallest.xpath || container.xpath == rectangle.xpath)
                continue;

            let parentWidth = container.width - (parentTolerance * 2) //trim from both sides
            let parentHeight = container.height - (parentTolerance * 2) //trim from both sides

            let area = parentWidth * parentHeight;
            if (area <= smallestArea)
                candidateContainers.push(container);
        }
        console.log("Candidate containers -----");
        console.log(JSON.stringify(candidateContainers) + '\n');
        return candidateContainers;
    }

    compare(a, b) {
        let comparison = 0;
        if (a.xpath > b.xpath) {
            comparison = 1;
        } else if (a.xpath < b.xpath) {
            comparison = -1;
        }
        return comparison;
    }

    /**
     * Given a set of equivalent parents, heuristics are applied to determine the parent.
     * @param {[Rectangles]} containers An array of possible container rectangle objects.
     * @param {Rectangle} rectangle The contained rectangle.
     */
    findParent(containers, rectangle) {
        let ancestorWithLongestXPath = undefined;
        let descendants = [];
        let family = [];
        containers.sort(this.compare); //More deterministic/stable.
        for (let container of containers) {
            if (rectangle.xpath.includes(container.xpath + '/')) { //container is a subxpath.
                if (ancestorWithLongestXPath === undefined)
                    ancestorWithLongestXPath = container;
                else if (ancestorWithLongestXPath.xpath.length < container.xpath.length) //longer subxpath wins.
                    ancestorWithLongestXPath = container;
            } else if (container.xpath.includes(rectangle.xpath + '/')) { //child is a subxpath of container.
                descendants.push(container)
            } else {
                family.push(container);
            }
        }
        if (ancestorWithLongestXPath !== undefined)
            return ancestorWithLongestXPath;

        let closestFamily = undefined;
        let closestFamilyScore = undefined;
        for (let container of family) { //Use the first container with closest ancestor.
            let maxLength = Math.min(container.xpath.length, rectangle.xpath.length)
            let score = 0;
            for (let i = 0; i < maxLength; i++) {
                if (container.xpath.charAt(i) !== rectangle.xpath.charAt(i))
                    break;
                score++;
            }
            if (closestFamily === undefined || closestFamilyScore < score) {
                closestFamily = container;
                closestFamilyScore = score;
            }
        }
        if (closestFamily !== undefined)
            return closestFamily;

        let shortestDescendantXPath = undefined;
        for (let container of descendants) {
            if (shortestDescendantXPath === undefined ||   //first shortest subxpath wins.
                shortestDescendantXPath.xpath.length > container.xpath.length)
                shortestDescendantXPath = container;
        }
        return shortestDescendantXPath;
    }

}

module.exports = RLG;