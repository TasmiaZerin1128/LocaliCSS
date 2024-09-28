
class CSSNode {
    constructor(element, xpath, driver) {
        this.elementHandle = element;
        this.xpath = xpath;
        this.styleSheetStyles = [];
        this.defaultStyles = [];
        this.computedStyles = [];
        this.developerCssProperties = [];
        this.parent = null;
        this.driver = driver;
        this.page = driver.page;
    }

    async findProperties() {
        console.log("Finding properties for element: " + this.xpath);
        this.styleSheetStyles = await this.driver.getStyleSheetProperties(this.elementHandle);
        this.inlineProperties = await this.driver.getInlineProperties(this.elementHandle);
        this.defaultStyles = await this.driver.getDefaultStyles(this.elementHandle);   // get the default styles of that element
        this.computedStyles = await this.driver.getComputedStyle(this.elementHandle);
        await this.getDeveloperDefinedProperties();
    }

    async getDeveloperDefinedProperties() {
        for (const property in this.styleSheetStyles) {
            this.developerCssProperties[property] = this.styleSheetStyles[property];
        }
        // Add inline styles, as they are always developer-defined
        for (const property in this.inlineProperties) {
            if (this.inlineProperties.hasOwnProperty(property)) {
                this.developerCssProperties[property] = this.inlineProperties[property];
            }
        }
    }    
}

module.exports = CSSNode;