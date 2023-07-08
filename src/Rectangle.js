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

}

module.exports = Rectangle;
