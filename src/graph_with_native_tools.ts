import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatRequest, ChatRequestState } from "./state";
import * as vscode from "vscode";
import { vscode_add } from "./tools";

const builder = new StateGraph(ChatRequest);

// A node that says hello
async function sayHello(state: ChatRequestState) {
    const model = state.request.model;
    const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(state.request.prompt)],
        {
            tools: [vscode_add],
        },
        state.token
    );
    let responseStr = "";
    const toolCalls: vscode.LanguageModelToolCallPart[] = [];

    for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
            state.stream.markdown(part.value);
            responseStr += part.value;
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
            toolCalls.push(part);
        }
    }
    const message = vscode.LanguageModelChatMessage.Assistant(responseStr);
    return {
        messages: [message],
    };
}

// A node that says bye
async function sayBye(state: ChatRequestState) {
    const model = state.request.model;
    // Create a chat request
    const response = await model.sendRequest(
        [...state.messages, vscode.LanguageModelChatMessage.User("Goodbye!")],
        {},
        state.token
    );
    let responseStr = "";
    const toolCalls: vscode.LanguageModelToolCallPart[] = [];

    for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
            state.stream.markdown(part.value);
            responseStr += part.value;
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
            toolCalls.push(part);
        }
    }

    const message = vscode.LanguageModelChatMessage.Assistant(responseStr);
    return {
        messages: [message],
    };
}

// Initialize the LangGraph
const graphBuilder = builder
    .addNode("sayHello", sayHello)
    .addNode("sayBye", sayBye) // Add the edges between nodes
    .addEdge(START, "sayHello")
    .addEdge("sayHello", "sayBye")
    .addEdge("sayBye", END);

// Compile the Graph
export const helloWorldGraph = graphBuilder.compile();
