class Range {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    /**
     * Returns true if the passed in Range object overlaps with 
     * 'this' Range object. 
     * @param {number} otherRange The Range object to compare with.
     */
    isOverlappingWith(otherRange) {
        return (this.inRange(otherRange.max) || this.inRange(otherRange.min)
            || otherRange.inRange(this.max) || otherRange.inRange(this.min));
    }
    /**
     * True if passed in value is within this Range.
     * @param {Number} value Any number.
     */
    inRange(value) {
        return (this.min <= value && this.max >= value);
    }
    
    getMergedRange(otherRange) {
        if (this.areMergeable(otherRange))
            return new Range(Math.min(this.min, otherRange.min), Math.max(this.max, otherRange.max));
        else
            undefined;
    }

    areMergeable(otherRange) {
        if (this.isOverlappingWith(otherRange))
            return true;
        else
            return ((this.min - 1 === otherRange.max || this.max + 1 === otherRange.min) ||
                (otherRange.min - 1 === this.max || otherRange.max + 1 === this.min));
    }

    length() {
        return this.max - this.min + 1;
    }

    getMaximum() {
        return this.max;
    }

    getMinimum() {
        return this.min;
    }

    getMiddle() {
        return Math.floor((this.min + this.max) / 2);
    }
 
    getNarrower() {
        return this.min - 1;
    }

    getWider() {
        return this.max + 1;
    }
}

class Ranges {
    constructor() {
        this.list = [];
    }

    getRangesList() {
        return this.list;
    }

    // Creates and returns a new Ranges object with a copy of this set of ranges.
    getCopy() {
        let copy = new Ranges();
        for (let i = 0; i < this.list.length; i++) {
            copy.list.push(this.list[i]);
        }
        return copy;
    }

    isEmpty() {
        if (this.list.length === 0)
            return true;
        return false;
    }

    // Returns true if value is one of the ranges
    inRanges(value) {
        for (let range of this.list) {
            if (range.inRange(value)) {
                return true;
            }
        }
        return false;
    }

    addValue(value) {
        this.addRange(new Range(value, value));
    }

    //Adds a range to the set of ranges.
    addRange(range) {
        let newRanges = [];
        let merged = range;
        for (let i = 0; i < this.list.length; i++) {
            let newMerged = this.list[i].getMergedRange(merged);
            if (newMerged) 
                merged = newMerged;
            else 
                newRanges.push(this.list[i]);
        }
        newRanges.push(merged);
        this.list = newRanges;
    }

    addRangeWithoutMergeable(newRange) {
        for (let range of this.list) {
            if (range.areMergeable(newRange)) {
                console.log('Warning: adding range that is mergeable without merging');
            }
        }
        this.list.push(newRange);
    }

    //add a new range to set of ranges
    addRanges(newRanges) {
        for (let range of newRanges.list) {
            this.addRange(range);
        }
    }

    getMergedRanges(newRanges) {
        let mergedRanges = this.list;
        for (let i = 0; i < otherRanges.list.length; i++) {
            mergedRanges.addRange(otherRanges.list[i]);
        }
        return mergedRanges;
    }

    /** Get a new set of ranges that has all values in 'this' set of ranges but not in
     * the passed in set of ranges.
     */
    butNotInRanges(notInTheseRanges) {
        let resultRanges = new Ranges();
        if (notInTheseRanges.isEmpty()) {
            return this.getCopy();
        }
        for (let range of this.list) {
            for (let i = range.min; i <= range.max; i++) {
                if (!notInTheseRanges.inRanges(i)) {
                    resultRanges.addValue(i);
                }
            }
        }
        return resultRanges;
    }

    sortRangesDescending() {
        this.list.sort((a,b) => {
            return b.max - a.max;
        });
        return this;
    }

}

module.exports = { Range, Ranges };