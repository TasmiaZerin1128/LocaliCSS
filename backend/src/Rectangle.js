const { tolerance } = require("../settings");

class Rectangle {

constructor(rectangle) {
  if (rectangle === null || rectangle === undefined) {
    this.visible = false;
    this.validSize = false;
    this.positiveCoordinates = false;
  } else {
    this.visible = true;
    this.validSize = true;
    this.x = rectangle.x;
    this.y = rectangle.y;
    this.width = rectangle.width;
    this.height = rectangle.height;

    this.left = rectangle.x;
    this.top = rectangle.y;
    this.right = rectangle.x + rectangle.width;
    this.bottom = rectangle.y + rectangle.height;

    this.minX = this.left;
    this.maxX = this.right;
    this.minY = this.top;
    this.maxY = this.bottom;

    this.xpath = rectangle.xpath;

    this.validSize = this.hasValidSize();
    this.positiveCoordinates = this.hasPositiveCoordinates();
  }
}

hasValidSize() {
  return (this.width > 0 && this.height > 0);
}

hasPositiveCoordinates() {
  return (this.minX >= 0 && this.minY >= 0);
}

isMissingValues(){
  return (this.minX === undefined || this.minY === undefined || this.maxX === undefined || this.maxY === undefined ||
      this.minX === null || this.minY === null || this.maxX === null || this.maxY === null)
}

isAboveMe(other, tol = tolerance.smallrange) {
  if (other.maxY - tol <= this.minY) //is other above me
      return true;
  return false;
}

isBelowMe(other, tol = tolerance.smallrange) {
  if (other.minY + tol >= this.maxY) //is other below me
      return true;
  return false;
}

isToMyRight(other, tol = tolerance.smallrange) {
  if (other.minX + tol >= this.maxX) //is other to the right of me
      return true;
  return false;
}

isToMyLeft(other, tol = tolerance.smallrange) {
  if (other.maxX - tol <= this.minX) //is other to the left of me
      return true;
  return false;
}

isOverlapping(other, tol = tolerance.collision) {
  if (this.isToMyRight(other, tol) || other.isToMyRight(this, tol))
      return false;
  //check if one is below the other
  if (this.isBelowMe(other, tol) || other.isBelowMe(this, tol))
      return false;
  //they are overlapping
  return true;
}

}

module.exports = Rectangle;
