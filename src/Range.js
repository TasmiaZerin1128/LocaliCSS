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
}

class Ranges {
    constructor() {
        this.list = [];
    }

    getRangesList() {
        return this.list;
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

}

module.exports = { Range, Ranges };