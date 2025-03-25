import {
    CallbackManagerForLLMRun
} from "@langchain/core/callbacks/manager";
import type {
    BaseFunctionCallOptions,
    BaseLanguageModelInput
} from "@langchain/core/language_models/base";
import {
    BaseChatModel, type BaseChatModelParams
} from "@langchain/core/language_models/chat_models";
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    isAIMessage,
    isHumanMessage,
    isSystemMessage,
    MessageContent,
    MessageContentComplex, SystemMessage, ToolMessage
} from "@langchain/core/messages";
import { isToolMessage, ToolCall } from "@langchain/core/messages/tool";
import { ChatGeneration, ChatResult } from "@langchain/core/outputs";
import {
    Runnable,
    RunnableConfig
} from "@langchain/core/runnables";
import {
    DynamicStructuredTool,
    DynamicStructuredToolInput,
    DynamicTool,
    StructuredTool
} from "@langchain/core/tools";
import * as vscode from "vscode";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

type ZodObjectAny = z.ZodObject<any, any, any, any>;

export interface CopilotChatToolInput<
    T extends ZodObjectAny | Record<string, any> = ZodObjectAny
> extends DynamicStructuredToolInput<
        T extends ZodObjectAny ? T : ZodObjectAny
    > {}

export class CopilotChatTool<
        T extends ZodObjectAny | Record<string, any> = ZodObjectAny
    >
    extends DynamicStructuredTool<T extends ZodObjectAny ? T : ZodObjectAny>
    implements
        vscode.LanguageModelChatTool,
        vscode.LanguageModelTool<
            z.infer<T extends ZodObjectAny ? T : ZodObjectAny>
        >
{
    inputSchema?: Record<string, unknown>;

    constructor(fields: CopilotChatToolInput<T>) {
        super(fields);
        this.inputSchema = zodToJsonSchema(fields.schema);
    }

    static lc_name(): string {
        return "CopilotChatTool";
    }

    invoke(
        input: string | ToolCall | { [x: string]: any },
        config?: RunnableConfig
    ): Promise<any>;
    invoke(
        options: vscode.LanguageModelToolInvocationOptions<
            z.infer<T extends ZodObjectAny ? T : ZodObjectAny>
        >,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.LanguageModelToolResult>;

    invoke(
        inputOrOptions:
            | string
            | ToolCall
            | { [x: string]: any }
            | vscode.LanguageModelToolInvocationOptions<ZodObjectAny>,
        configOrToken?: RunnableConfig | vscode.CancellationToken
    ): Promise<any> | vscode.ProviderResult<vscode.LanguageModelToolResult> {
        if (
            inputOrOptions &&
            typeof inputOrOptions === "object" &&
            "input" in inputOrOptions
        ) {
            // Second overload - VSCode tool invocation
            const options =
                inputOrOptions as vscode.LanguageModelToolInvocationOptions<ZodObjectAny>;
            const token = configOrToken as vscode.CancellationToken;
            super.invoke(options.input);
        } else {
            // First overload - Standard LangChain invocation
            const input = inputOrOptions as
                | string
                | ToolCall
                | { [x: string]: any };
            const config = configOrToken as RunnableConfig;
            return super.invoke(input, config);
        }
    }
}

type CopilotChatToolType =
    | StructuredTool
    | DynamicStructuredTool
    | DynamicTool
    | CopilotChatTool;

export function toCopilotChatTool(tool: CopilotChatToolType): CopilotChatTool {
    if (tool instanceof CopilotChatTool) {
        return tool as CopilotChatTool;
    }
    if (tool instanceof DynamicStructuredTool) {
        return new CopilotChatTool({
            name: tool.name,
            description: tool.description,
            schema: tool.schema as CopilotChatToolInput["schema"],
            func: (input, runManager?, config?) => {
                return tool.invoke(input, config);
            },
        });
    }
    if (tool instanceof StructuredTool) {
        return new CopilotChatTool({
            name: tool.name,
            description: tool.description,
            schema: tool.schema as CopilotChatToolInput["schema"],
            func: (input, runManager?, config?) => {
                return tool.invoke(input, config);
            },
        });
    }
    throw new Error("Invalid tool type");
}

export declare interface CopilotBaseInput {
    model: vscode.LanguageModelChat;
    token: vscode.CancellationToken;
}

export declare interface ChatCopilotFields
    extends BaseChatModelParams,
        CopilotBaseInput {}

export declare interface ChatCopilotCallOptions
    extends vscode.LanguageModelChatRequestOptions,
        BaseFunctionCallOptions {}

function toTextContent(
    content: MessageContent
): Array<vscode.LanguageModelTextPart> {
    if (typeof content === "string") {
        return [new vscode.LanguageModelTextPart(content)];
    } else if (Array.isArray(content)) {
        return content.map((part: MessageContentComplex) => {
            if (part.type === "text") {
                return new vscode.LanguageModelTextPart(part.text);
            } else if (part.type === "image_url") {
                return new vscode.LanguageModelTextPart(part.image_url.url);
            } else {
                throw new Error(`message part type not supported: ${part}`);
            }
        });
    } else {
        throw new Error("Unknown message content type");
    }
}

function convertBaseMessage(
    message: BaseMessage
): vscode.LanguageModelChatMessage {
    if (isAIMessage(message)) {
        // if this is a tool_call message
        if (!!message.tool_calls?.length) {
            const aiMessage = message as AIMessage & { tool_calls: ToolCall[] };
            const toolCallParts = aiMessage.tool_calls.map(
                (toolCall: ToolCall): vscode.LanguageModelToolCallPart => {
                    return new vscode.LanguageModelToolCallPart(
                        toolCall.id || "",
                        toolCall.name,
                        toolCall.args
                    );
                }
            );
            return vscode.LanguageModelChatMessage.Assistant(
                toolCallParts,
                aiMessage.name
            );
        }
        // if this is a text message
        return vscode.LanguageModelChatMessage.Assistant(
            toTextContent(message.content),
            message.name
        );
    } else if (isHumanMessage(message)) {
        // if this is a text message
        const humanMessage = message as HumanMessage;
        return vscode.LanguageModelChatMessage.User(
            toTextContent(humanMessage.content),
            humanMessage.name
        );
    } else if (isToolMessage(message)) {
        // if this is a tool result message
        const toolMessage = message as ToolMessage;
        const toolResult = new vscode.LanguageModelToolResultPart(
            toolMessage.tool_call_id,
            toTextContent(toolMessage.content)
        );
        return vscode.LanguageModelChatMessage.User(
            [toolResult],
            toolMessage.name
        );
    } else if ( isSystemMessage(message)) {
        // if this is a system message
        const systemMessage = message as SystemMessage;
        return vscode.LanguageModelChatMessage.User(
            toTextContent(systemMessage.content),
            systemMessage.name
        );
    } else {
        throw new Error(`Unsupported message type: ${message}`);
    }
}

export class ChatCopilot extends BaseChatModel<
    ChatCopilotCallOptions,
    AIMessageChunk
> {
    protected model: vscode.LanguageModelChat;
    token: vscode.CancellationToken;

    constructor(fields: ChatCopilotFields) {
        super(fields ?? {});
        this.model = fields.model;
        this.token = fields.token;
    }

    static lc_name(): string {
        return "ChatCopilot";
    }

    _llmType(): string {
        return "copilot";
    }

    get callKeys(): string[] {
        return [...super.callKeys];
    }

    async _generate(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        let copilotMessages: vscode.LanguageModelChatMessage[] = messages.map(
            (message): vscode.LanguageModelChatMessage => {
                return convertBaseMessage(message);
            }
        );
        const lastMessage = messages.at(-1) as BaseMessage;
        if (messages.length > 0 && isToolMessage(lastMessage)) {
            // if the last message is a tool message, we need to append a human message
            copilotMessages.push(
                vscode.LanguageModelChatMessage.User("Above is the result of calling one or more tools. The user cannot see the results, so you " +
                    "should explain them to the user if referencing them in your answer."
                )
            );
        }

        const response = await this.model.sendRequest(
            copilotMessages,
            // options,
            {
                tools: options.tools?.map((tool) => {
                    return {
                        name: tool.name,
                        description: tool.description,
                        inputSchema: tool.inputSchema,
                    };
                }),
            },
            this.token
        );

        let text = "";
        const toolCalls: ToolCall[] = [];

        for await (const part of response.stream) {
            if (part instanceof vscode.LanguageModelTextPart) {
                text += part.value;
            } else if (part instanceof vscode.LanguageModelToolCallPart) {
                toolCalls.push({
                    id: part.callId,
                    name: part.name,
                    args: part.input,
                    type: "tool_call"
                });
            } else {
                throw new Error("Unknown part type");
            }
        }
        let result: ChatResult = {
            generations: [],
        };

        const message = new AIMessage(text);
        message.tool_calls = toolCalls;
        const generation: ChatGeneration = {
            text: text,
            message: message,
        };
        result.generations.push(generation);
        return result;
    }

    bindTools(
        tools: CopilotChatToolType[],
        kwargs?: Partial<ChatCopilotCallOptions> | undefined
    ): Runnable<
        BaseLanguageModelInput,
        AIMessageChunk,
        ChatCopilotCallOptions
    > {
        return this.bind({
            tools: tools.map((tool) => toCopilotChatTool(tool)),
            ...kwargs,
        });
    }
}
