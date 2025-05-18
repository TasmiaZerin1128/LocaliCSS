require('dotenv').config()
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const encodeImage = require("./sendImage.js");
const retrieve = require("./retrieval");
const { ChatMistralAI } = require("@langchain/mistralai");


const DEFINITIONS = {
    "Element-Collision": "Elements collide into one another due to insufficient accommodation space when viewport width reduces.",
    "Element-Protrusion": "When the child element is contained within its container, but as the viewport width decreases, it lacks sufficient space to fit within its parent. As a result, the child element protrudes out of its container.",
    "Viewport-Protrusion": "As the viewport size decreases, elements may not only overflow their containers but also protrude out of the viewable area of the webpage (i.e., the <BODY> tag), causing them to appear outside the horizontally visible portion of the page.",
    "Wrapping": "When the container is not wide enough but has a flexible height, horizontally aligned elements contained within it no longer fit side by side, causing “wrap” to a new line on the page."
}

let collision_collection = "SO_collision";
let protrusion_collection = "SO_protrusion";
let wrapping_collection = "SO_wrapping";

const COLLECTIONS = {
    "Element-Collision": collision_collection,
    "Element-Protrusion": protrusion_collection,
    "Viewport-Protrusion": protrusion_collection,
    "Wrapping": wrapping_collection
}

const apiKey = process.env.MISTRAL_API_KEY || "your_api_key";
console.log("API Key:", apiKey);

const model = new ChatMistralAI({
  model: "pixtral-12b",
  apiKey: apiKey,
});

class LLMRepair {
    
    constructor(localizedNode, repairFile) {
        this.repairFile = repairFile;
        this.failureRange = localizedNode.failure.range.min + " - " + localizedNode.failure.range.max;
        this.failureType = localizedNode.failure.type;
        this.failureDirection = localizedNode.failure.horizontalOrVertical;
        this.failureNode = localizedNode.node.xpath;
        this.failureNodeRect = "minX: " + localizedNode.node.rect.minX + ", minY: " + localizedNode.node.rect.minY + ", maxX: " + localizedNode.node.rect.maxX + ", maxY: " + localizedNode.node.rect.maxY;
        
        if (this.failureType == "Element-Collision") {
            this.failureSibling = localizedNode.sibling.xpath;
            this.failureSiblingRect = "minX: " + localizedNode.sibling.rect.minX + ", minY: " + localizedNode.sibling.rect.minY + ", maxX: " + localizedNode.sibling.rect.maxX + ", maxY: " + localizedNode.sibling.rect.maxY;
            this.failureSiblingCSS = localizedNode.sibling.rect.cssNode.developerCssProperties;
        }
        this.failureParent = localizedNode.parent.xpath;
        this.failureParentRect = "minX: " + localizedNode.parent.rect.minX + ", minY: " + localizedNode.parent.rect.minY + ", maxX: " + localizedNode.parent.rect.maxX + ", maxY: " + localizedNode.parent.rect.maxY;

        this.failureNodeCSS = localizedNode.node.rect.cssNode.developerCssProperties;
        this.failureParentCSS = localizedNode.parent.rect.cssNode.developerCssProperties;

        this.failureMinScreenshot = localizedNode.failure.failureMinScreenshot;
        this.failureMaxScreenshot = localizedNode.failure.failureMaxScreenshot;
        this.failureOuterLowerSS = localizedNode.failure.failureLowerBoundScreenshot;
        this.failureOuterUpperSS = localizedNode.failure.failureUpperBoundScreenshot;
        this.faultyProperties = localizedNode.faultyCSSProperties;
    }

    async createPrompt() {
        console.log("Retrieve first============\n")
        const retrieveDocs = await retrieve(
            COLLECTIONS[this.failureType],
            this.faultyProperties.map(element => element["property"])
        );

        console.log("\n===Sending this to Mistral Model===\n");
        const promptTemplate = ChatPromptTemplate.fromMessages([
            [
            "system",
            "You are an automated program repair tool which works as an expert in CSS and HTML.",
            ],
            [
            "user",
            `Fix the following responsive layout failure using the provided context: 
                    RLF Type: {RLF_type},
                    Type Definition: {Type_definition},
                    Failure element XPaths: {Failure_element_XPaths},
                    Failure element rectangle coordinates: {Failure_element_rect},
                    Failure Viewport range: {viewport_range},
                    Localized properties which are causing the failure (ranked from most to least problematic): {localized_property},
                    screenshot of the failure region: {screenshot_failure},
                    screenshot of the lower and upper bound layouts where there is no failure: {screenshot_lower_bound}, {screenshot_upper_bound},
                    5 relevant stack overflow threads containing answers and comments: {relevant_stack_overflow_threads}.
                    Only return the repaired values of the localized properties, do not include details. Ensure to keep the web layout responsive (DO NOT USE px, try to use rem, em, or %) and maintain the original design.
                    Let's think step by step.`,
            ],
        ]);

        const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

        const response = await chain.invoke({
            RLF_type: this.failureType,
            Type_definition: DEFINITIONS[this.failureType],
            Failure_element_XPaths: `Node 1:${this.failureNode}, Node 2: ${this.failureParent}, ${this.failureSibling ? this.failureSibling : ""}`,
            Failure_element_rect: `Node 1:${this.failureNodeRect}, Node 2: ${this.failureParentRect}, ${this.failureSibling ? this.failureSiblingRect : ""}`,
            viewport_range: this.failureRange,
            localized_property: this.faultyProperties,
            screenshot_failure: encodeImage(
            this.failureMinScreenshot
            ),
            screenshot_lower_bound: null,
            screenshot_upper_bound: encodeImage(
            this.failureOuterUpperSS
            ),
            relevant_stack_overflow_threads: JSON.stringify(retrieveDocs),
        });

        console.log(response);
    }
}


module.exports = LLMRepair;