


class TargetArea {

    constructor(area) {
        this.targetImages = [];
        this.area = area;
    }

    checkAreaOfImages() {
        let background = this.targetImages[2];
        let firstOnlyOpaque = this.targetImages[0];
        let secondOnlyOpaque = this.targetImages[1];
        if ((background.area.width == secondOnlyOpaque.area.width) &&
            (secondOnlyOpaque.area.width == firstOnlyOpaque.area.width) &&
            (background.area.height == secondOnlyOpaque.area.height) &&
            (secondOnlyOpaque.area.height == firstOnlyOpaque.area.height)) {
                return true;
        } else {
            return false;
        }
    }

    checkSides() {
        if ((this.area.width > 0) && (this.area.height > 0)) {
            return false;
        }
        return true;
    }

    pixelCheck(HTMLParentRelationship = false, collision = true, featureHiddenDetection) {
        let background = this.targetImages[0];
        let firstOnlyOpaque = this.targetImages[1];
        let secondOnlyOpaque = this.targetImages[2];
        let BothOpaque = null;
        if (!HTMLParentRelationship && collision)
            BothOpaque = this.targetImages[3];
    
        for (let i = 0; i < background.height; i++) {
            for (let j = 0; j < background.width; j++) {
                let rgb1 = background.getPixel(j, i);
                let rgb2 = secondOnlyOpaque.getPixel(j, i);
                let rgb3 = firstOnlyOpaque.getPixel(j, i);
                let rgb4 = 0;
                if (!HTMLParentRelationship && collision)
                    rgb4 = BothOpaque.getPixel(j, i);
                if (rgb1 !== rgb2 && rgb1 !== rgb3) {
                    return true;
                }
                if (collision & featureHiddenDetection) {
                    if (rgb1 !== rgb2) {
                        if (HTMLParentRelationship) {
                            if (rgb2 !== rgb3) {
                                console.log("Special Case Found - Element Hidden");
                                return true;
                            }
                        } else {
                            if (rgb2 !== rgb4) {
                                console.log("Special Case Found - Element Hidden");
                                return true;
                            }
                        }
                    } else if (rgb1 !== rgb3) {
                        if (!HTMLParentRelationship)
                            if (rgb3 !== rgb4) {
                                console.log("Special Case Found - Element Hidden");
                                return true;
                            }
                    }
                }
            }
        }
        return false;
    }

    anyChange() {
        let background = this.targetImages[0];
        let withElement = this.targetImages[1];
    
        for (let i = 0; i < background.height; i++) {
            for (let j = 0; j < background.width; j++) {
                let rgb1 = getPixel(background, j, i);
                let rgb2 = getPixel(withElement, j, i);
    
                if (rgb1 !== rgb2) {
                    return true;
                }
            }
        }
        return false;
    }

    getPixel(image, x, y) {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
    
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0, image.width, image.height);
    
        let imageData = context.getImageData(x, y, 1, 1);
        let data = imageData.data;
    
        return {
            r: data[0],
            g: data[1],
            b: data[2],
            a: data[3]
        };
    }
}

module.exports = TargetArea;