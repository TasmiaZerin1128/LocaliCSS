const RBush = require('rbush');
const { Range } = require('./Range.js');
const RLGNode = require('./RLGNode.js');
const Rectangle = require('./Rectangle.js');
const settings = require('../settings.js');
const RepairStatistics = require('./RepairStatistics.js');
const cliProgress = require('cli-progress');
const utils = require('./utils.js');
const ProgressBar = require('progress');

const tolerance = settings.tolerance;

class RLG {
    constructor(outputDir, webpage, run) {
        this.ranges = new Range();
        this.root = undefined;
        this.map = new Map();
        this.nodesWithFailures = [];
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
            let intersectingRectangles = dom.rbush.search(rect);
            let intersectionTypes = rlg.findIntersectionTypes(intersectingRectangles, rect);

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
                siblingsRBush.load(parentRectangle.children); //bulk insert all children (rectangles)
                for (let childRect of parentRectangle.children) {
                    let childNode = this.getRLGNode(childRect.xpath);
                    // get Parent - child edge
                    let pcEdge = parentNode.addChild(childNode, viewport);
                    if (settings.capturePCAlignments === true) {
                        this.addPCEdgeAttributes(parentRectangle, childRect, pcEdge, viewport);
                    }
                    let collisionRBush = new RBush();

                    let newTargetRect = {
                        minX: childRect.minX + tolerance.collision,
                        maxX: childRect.maxX - tolerance.collision,
                        minY: childRect.minY + tolerance.collision,
                        maxY: childRect.maxY - tolerance.collision,
                        xpath: childRect.xpath
                    }

                    collisionRBush.insert(newTargetRect);
                    for (let rect of parentRectangle.children) {
                        if (rect.xpath !== childRect.xpath) {
                            collisionRBush.insert(rect);
                        }
                    }
                    let overlappingRectangles = collisionRBush.search(newTargetRect);
                    for (let overlappingRect of overlappingRectangles) {
                        if (childRect.xpath === overlappingRect.xpath)
                            continue;
                        let overlappingSiblingNode = rlg.getRLGNode(overlappingRect.xpath);
                        childNode.addOverlap(overlappingSiblingNode, viewport);
                    }
                    if (settings.captureSiblingAlignments === true) {
                        //Capture above relationship
                        let aboveArea = this.getAboveArea(parentRectangle, childRect);
                        overlappingRectangles = siblingsRBush.search(aboveArea);
                        for (let overlappingRect of overlappingRectangles) {
                            if (childRect.xpath === overlappingRect.xpath)
                                continue;
                            if (overlappingRect.maxY - tolerance.smallrange <= aboveArea.maxY) {
                                let siblingNode = rlg.getRLGNode(overlappingRect.xpath);
                                childNode.addToAbove(siblingNode, viewport);
                            }
                        }
                        //Capture below relationship.
                        let belowArea = this.getBelowArea(parentRectangle, childRect);
                        overlappingRectangles = siblingsRBush.search(belowArea);
                        for (let overlapRect of overlappingRectangles) {
                            if (childRect.xpath === overlapRect.xpath)
                                continue;
                            if (overlapRect.minY + tolerance.smallrange >= belowArea.minY) {
                                let siblingNode = rlg.getRLGNode(overlapRect.xpath);
                                childNode.addToBelow(siblingNode, viewport);
                            }
                        }
                        //Capture to the right relationship.
                        let rightArea = this.getRightArea(parentRectangle, childRect);
                        overlappingRectangles = siblingsRBush.search(rightArea);
                        for (let overlapRect of overlappingRectangles) {
                            if (childRect.xpath === overlapRect.xpath)
                                continue;
                            if (overlapRect.minX + tolerance.smallrange >= rightArea.minX) {
                                let siblingNode = rlg.getRLGNode(overlapRect.xpath);
                                childNode.addToRight(siblingNode, viewport);
                            }
                        }
                        //Capture to the left relationship.
                        let leftArea = this.getLeftArea(parentRectangle, childRect);
                        overlappingRectangles = siblingsRBush.search(leftArea);
                        for (let overlapRect of overlappingRectangles) {
                            if (childRect.xpath === overlapRect.xpath)
                                continue;
                            if (overlapRect.maxX - tolerance.smallrange <= leftArea.maxX) {
                                let siblingNode = rlg.getRLGNode(overlapRect.xpath);
                                childNode.addToLeft(siblingNode, viewport);
                            }
                        }
                    }
                }
                
            }
        }
        domRectangles = dom.rbush.all();
        for (let rect of domRectangles) {
            let rlgNode = rlg.getRLGNode(rect.xpath);

            let intersectingRectangles = dom.rbush.search(rect);
            //set edge for containers (To remove FP prtotrusion)
            let allContainers = rlg.findAllContainers(intersectingRectangles, rect);
            for (let container of allContainers) {
                let containerNode = rlg.getRLGNode(container.xpath);
                rlgNode.addContainer(containerNode, viewport);
            }
        }
    }

    findAllContainers(overlappingRectangles, targetRect) {
        let containers = [];
        let tol = 0;
        if (tolerance.protrusion !== undefined && tolerance.protrusion > 0)
            tol = tolerance.protrusion;
        for (let overlapRect of overlappingRectangles) {
            if (overlapRect.minX - tol <= targetRect.minX
                && overlapRect.maxX + tol >= targetRect.maxX
                && overlapRect.minY - tol <= targetRect.minY
                && overlapRect.maxY + tol >= targetRect.maxY) {
                containers.push(overlapRect);
            }
        }
        return containers;
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
        // console.log(JSON.stringify(containers));
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
        // console.log("Candidate containers -----");
        // console.log(JSON.stringify(candidateContainers) + '\n');
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

    addPCEdgeAttributes(parentRect, childRect, pcEdge, viewport) {
        if (settings.capturePCVerticalAlignments === true) {
            if (this.isVerticallyCenterJustified(parentRect, childRect))
                pcEdge.verticallyCenterJustifiedRanges.addValue(viewport);
            if (this.isTopJustified(parentRect, childRect))
                pcEdge.topJustifiedRanges.addValue(viewport);
            if (this.isBottomJustified(parentRect, childRect))
                pcEdge.bottomJustifiedRanges.addValue(viewport);
        }
        if (this.isHorizontallyCenterJustified(parentRect, childRect))
            pcEdge.horizontallyCenterJustifiedRanges.addValue(viewport);
        if (this.isLeftJustified(parentRect, childRect))
            pcEdge.leftJustifiedRanges.addValue(viewport);
        if (this.isRightJustified(parentRect, childRect))
            pcEdge.rightJustifiedRanges.addValue(viewport);
    }

    //Returns rectangle area above the child within the parent.
    getAboveArea(parentRect, childRect) {
        return {
            minX: parentRect.minX,
            maxX: parentRect.maxX,
            minY: parentRect.minY,
            maxY: childRect.minY
        };
    }
    
    //Returns rectangle area below the child within the parent.
    getBelowArea(parentRect, childRect) {
        return {
            minX: parentRect.minX,
            maxX: parentRect.maxX,
            minY: childRect.maxY,
            maxY: parentRect.maxY
        };
    }
    
    //Returns rectangle area right of the child within the parent.
    getRightArea(parentRect, childRect) {
        return {
            minX: childRect.maxX,
            maxX: parentRect.maxX,
            minY: parentRect.minY,
            maxY: parentRect.maxY
        };
    }

    //Returns rectangle area left of the child within the parent.
    getLeftArea(parentRect, childRect) {
        return {
            minX: parentRect.minX,
            maxX: childRect.minX,
            minY: parentRect.minY,
            maxY: parentRect.maxY
        };
    }
    
    // Returns true if the child is top justified.
    isTopJustified(parentRect, childRect) {
        return (parentRect.minY === childRect.minY);
    }
    
    // Returns true if the child is bottom justified.
    isBottomJustified(parentRect, childRect) {
        return (parentRect.maxY === childRect.maxY);
    }

    // Returns true if the child is left justified.
    isLeftJustified(parentRect, childRect) {
        return (parentRect.minX === childRect.minX);
    }

    // Returns true if the child is right justified.
    isRightJustified(parentRect, childRect) {
        return (parentRect.maxX === childRect.maxX);
    }
    
    // Returns true if the child is horizontally center justified.
    isHorizontallyCenterJustified(parentRect, childRect) {
        return (childRect.minX - parentRect.minX === parentRect.maxX - childRect.maxX);
    }

    // Returns true if the child is vertically center justified.
    isVerticallyCenterJustified(parentRect, childRect) {
        return (childRect.minY - parentRect.minY === parentRect.maxY - childRect.maxY);
    }

    hasFailure(failure) {
        for (let node of this.nodesWithFailures) {
            if (node.hasFailure(failure) === true)
                return true;
        }
        return false;
    }

    detectFailures(progress = true) {
        let bar = new ProgressBar('Find RLFs  | [:bar] | :etas |  Node: :current' + "/" + this.map.size, { complete: '█', incomplete: '░', total: this.map.size, width: 25 })
        let bodyNode = this.map.get('/HTML/BODY');
        let nodesWithFailures = [];
        this.map.forEach((node) => {
            node.detectFailures(bodyNode);
            if (node.hasFailures()) {
                // console.log("Node ");
                // console.log(node);
                nodesWithFailures.push(node);
            }
            if (progress) {
                bar.tick();
            }
        });
        this.nodesWithFailures = nodesWithFailures;
        console.log('Failure Nodes before classify: ' + this.nodesWithFailures.length);
    }

    // Classify the failure of all nodes with failures
    async classifyFailures(driver, classificationFile, snapshotDirectory) {
        let bar = new ProgressBar('Classify RLFs  | [:bar] | :percent :etas | Classification Completed :current/' + utils.failureCount, { complete: '█', incomplete: '░', total: utils.failureCount, width: 25});
        console.log('Failure Nodes: ' + this.nodesWithFailures.length);
        for (const node of this.nodesWithFailures) {
            await node.classifyFailures(driver, classificationFile, snapshotDirectory, bar);
        }
    }

    async screenshotFailures(driver, directory) {
        let bar = new ProgressBar('Screenshot RLFs  | [:bar] | :percent :etas | Screenshot Completed :current/' + utils.failureCount, { complete: '█', incomplete: '░', total: utils.failureCount, width: 25});
        for (const node of this.nodesWithFailures) {
            await node.screenshotFailures(driver, directory, bar);
        } 
    }

    printGraph(file, printAlignments = false) {
        let text = '*';
        utils.printToFile(file, text);
        this.map.forEach(function (node) {
            if (printAlignments)
                node.print(file, true, true);
            else
                node.print(file);
        });
    }

    printFailuresTXT(fileTXT) {
        let text = '*';
        utils.printToFile(fileTXT, text);
        this.map.forEach(function (node) {
            node.printFailures(fileTXT, true);
        })
        text = utils.failureCount + ' Responsive Layout Failures Found.';
        utils.printToFile(fileTXT, text);
    }
    /**
     * Prints the failures of the RLG to CSV.
     * @param {Path} file File to save to.
     * @param {String} webpage Name of webpage.
     * @param {Number} run The run number.
     * @param {String} repairApplied repair applied before before extracting RLG.
     * @param {Number} repairAppliedTo The repair was applied to resolve the given failure-number/ID.
     */
    printFailuresCSV(fileCSV, webpage, run, repairApplied = 'none', repairAppliedTo = 0) {
        if (utils.failureCount > 0) {
            let text =
                "Webpage,Run,FID,Type,RangeMin,RangeMax,XPath1,XPath2,ClassNarrower,ClassMin,ClassMid,ClassMax,ClassWider,RepairApplied,RepairAppliedTo";
            utils.printToFile(fileCSV, text);
            this.map.forEach(function (node) {
                node.printFailuresCSV(fileCSV, webpage, run, repairApplied, repairAppliedTo);
            })
        }

    }

}

module.exports = RLG;