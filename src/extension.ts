// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// https://github.com/microsoft/vscode-extension-samples/blob/main/chat-sample
import * as vscode from 'vscode';
import { helloWorldGraph } from './graph_with_tools';
// import { helloWorldGraph } from './graph_with_tools';
// import { createReactAgent } from "@langchain/langgraph/prebuilt";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	) => {
		const response = await helloWorldGraph.invoke({
			request,
			chatContext,
			stream,
			token,
		});

	};

	context.subscriptions.push(
		vscode.chat.createChatParticipant("hhl-copilot-langgraph.HelloGraph", handler)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
