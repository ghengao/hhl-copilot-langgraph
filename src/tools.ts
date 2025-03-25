import { tool } from "@langchain/core/tools";

import { z } from "zod";
import * as vscode from "vscode";

export const add = tool(
    async ({ a, b }: { a: number; b: number }) => {
        const result = a + b;
        return result;
    },
    {
        name: "add",
        description: "Add two numbers.",
        schema: z.object({
            a: z.number().describe("The first number."),
            b: z.number().describe("The second number."),
        }),
    }
);

const addSchema = z.object({
    a: z.number().describe("The first number."),
    b: z.number().describe("The second number."),
});

type addParameters = z.infer<typeof addSchema>;

export class Add implements vscode.LanguageModelTool<addParameters> {
    name: string = "add";
    description: string = "Add two numbers.";
    inputSchema = {
        type: "object",
        properties: {
            a: {
                type: "number",
                description: "The first number.",
            },
            b: {
                type: "number",
                description: "The second number.",
            },
        },
        required: ["a", "b"],
    };

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<addParameters>,
        _token: vscode.CancellationToken
    ) {
        const result = options.input.a + options.input.b;
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(`${result}.`),
        ]);
    }
}

export const vscode_add = new Add();
