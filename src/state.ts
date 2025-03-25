import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import * as vscode from "vscode";

export const ChatRequest = Annotation.Root({
    request: Annotation<vscode.ChatRequest>,
    chatContext: Annotation<vscode.ChatContext>,
    stream: Annotation<vscode.ChatResponseStream>,
    token: Annotation<vscode.CancellationToken>,
    messages: Annotation<vscode.LanguageModelChatMessage[]>({
        reducer: (
            left: vscode.LanguageModelChatMessage[],
            right: vscode.LanguageModelChatMessage[]
        ) => {
            return [...left, ...right];
        },
        default: () => [],
    }),
});

export type ChatRequestState = typeof ChatRequest.State;

export const LcChatRequest = Annotation.Root({
    request: Annotation<vscode.ChatRequest>,
    chatContext: Annotation<vscode.ChatContext>,
    stream: Annotation<vscode.ChatResponseStream>,
    token: Annotation<vscode.CancellationToken>,
    messages: Annotation<BaseMessage[]>({
        reducer: (left: BaseMessage[], right: BaseMessage[]) => {
            return [...left, ...right];
        },
        default: () => [],
    }),
});

export type LcChatRequestState = typeof LcChatRequest.State;
