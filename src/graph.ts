import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatRequest, ChatRequestState } from "./state";
import * as vscode from "vscode";

const builder = new StateGraph(ChatRequest);

// A node that says hello
async function sayHello(state: ChatRequestState) {
    // Select the chat model
    // const models = await vscode.lm.selectChatModels({
    // vendor: "copilot",
    // family: "gemini-2.0-flash",
    // id: "gemini-2.0-flash-001",

    // vendor: "copilot",
    // family: "claude-3.5-sonnet",
    // id: "claude-3.5-sonnet",

    // vendor: "copilot",
    // family: "claude-3.7-sonnet",
    // id: "claude-3.7-sonnet",

    // vendor: "copilot",
    // family: "claude-3.7-sonnet-thought",
    // id: "claude-3.7-sonnet-thought",

    // vendor: "copilot",
    // family: "gpt-4o",
    // id: "gpt-4o",

    // vendor: "copilot",
    // family: "o3-mini",
    // id: "o3-mini",

    // vendor: "copilot",
    // family: "o1-ga",
    // id: "o1",
    // });
    // const model = models[0];
    // Create a chat request
    // Use the user selected chat model
    const model = state.request.model;
    const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(state.request.prompt)],
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
        } else {
            console.log("part:", part);
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
    console.log("state messages:", state.messages);
    const response = await model.sendRequest(
        [
            ...state.messages,
            vscode.LanguageModelChatMessage.User("Goodbye!"),
        ],
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

// Initialise the LangGraph
const graphBuilder = builder
    .addNode("sayHello", sayHello)
    .addNode("sayBye", sayBye) // Add the edges between nodes
    .addEdge(START, "sayHello")
    .addEdge("sayHello", "sayBye")
    .addEdge("sayBye", END);

// Compile the Graph
export const helloWorldGraph = graphBuilder.compile();
