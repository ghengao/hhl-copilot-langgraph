import { StateGraph, START, END } from "@langchain/langgraph";
import { LcChatRequest, LcChatRequestState } from "./state";
import { ChatCopilot } from "./models";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { add } from "./tools";
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
} from "@langchain/core/messages";

const tools = [add];
const toolNode = new ToolNode(tools);
const builder = new StateGraph(LcChatRequest);

// A node that performs a language model call
async function llmCall(state: LcChatRequestState) {
    const model = state.request.model;
    const llm = new ChatCopilot({
        model: model,
        token: state.token,
    });
    const llm_with_tools = llm.bindTools(tools);

    let messages: BaseMessage[] = [];
    if (state.messages.length === 0) {
        messages = [
            new SystemMessage(
                `You are a helpful assistant tasked with performing arithmetic on a set of inputs. Following are the instructions:
                - You must only use the tool for mathematical operations do not try to the operations yourself.
                - The user will ask a question, or ask you to perform a task, and it may require lots of
                  research to answer correctly. There is a selection of tools that let you perform actions
                  or retrieve helpful context to answer the user's question.
                - If you aren't sure which tool is relevant, you can call multiple tools. You can call
                  tools repeatedly to take actions or gather as much context as needed until you have
                  completed the task fully. Don't give up unless you are sure the request cannot be
                  fulfilled with the tools you have.
                - Don't make assumptions about the situation
                - Gather context first, then perform the task or answer the question.
                - Don't ask the user for confirmation to use tools, just use them.`
            ),
            new HumanMessage(state.request.prompt),
        ];
    }
    const aiMsg = await llm_with_tools.invoke([...state.messages, ...messages]);
    messages.push(aiMsg);
    state.stream.markdown(aiMsg.content as string);
    return {
        messages: messages,
    };
}
// Conditional edge function to route to the tool node or end
function shouldContinue(state: LcChatRequestState): string {

    const messages = state.messages;
    const lastMessage = messages.at(-1) as BaseMessage;

    // If the LLM makes a tool call, then perform an action
    if ((lastMessage as AIMessage)?.tool_calls?.length) {
        return "Action";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
}

// Initialize the LangGraph
const graphBuilder = builder
    .addNode("llmCall", llmCall)
    .addNode("tools", toolNode) // Add the edges between nodes
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, {
        Action: "tools",
        __end__: END,
    })
    .addEdge("tools", "llmCall");

// Compile the Graph
export const helloWorldGraph = graphBuilder.compile();
