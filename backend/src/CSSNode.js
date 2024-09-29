
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
        const allStyles = this.driver.getAllStyles(this.elementHandle);
        this.styleSheetStyles = allStyles.definedStyles;
        this.inlineProperties = allStyles.inlineStyles;
        this.defaultStyles = allStyles.defaultStyles;  // get the default styles of that element
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