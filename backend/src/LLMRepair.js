import "dotenv/config";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import encodeImage from "./sendImage.js";


class LLMRepair {
    constructor() {

    }

    async createPrompt() {
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
                    Viewport range: {viewport_range},
                    localized property which is causing the failure: {localized_property},
                    screenshot of the failure region: {screenshot_failure},
                    screenshot of the lower and upper bound layouts: {screenshot_lower_bound}, {screenshot_upper_bound},
                    5 relevant stack overflow threads containing answers and comments: {relevant_stack_overflow_threads}.
                    Only return the repaired value of the localized property, do not include details. Ensure to keep the web layout responsive (DO NOT USE px, try to use rem, em, or %) and maintain the original design.
                    Let's think step by step.`,
            ],
        ]);

        const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

        const response = await chain.invoke({
            RLF_type: "Element Collision",
            Type_definition:
            "Elements collide into one another due to insufficient accommodation space when viewport width reduces.",
            Failure_element_XPaths: "Node 1:/HTML/BODY/HEADER, Node 2: /HTML/BODY/DIV",
            viewport_range: "600-680",
            localized_property: "margin-bottom: 20px of Node: /HTML/BODY/HEADER",
            screenshot_failure: encodeImage(
            "FID-1-element-collision-320-680-capture-320-TP.png"
            ),
            screenshot_lower_bound: null,
            screenshot_upper_bound: encodeImage(
            "FID-1-element-collision-320-680-capture-681-FP.png"
            ),
            relevant_stack_overflow_threads: JSON.stringify(retrieveDocs),
        });

        console.log(response);
    }
}


module.exports = LLMRepair;