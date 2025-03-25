# Can Langgraphjs be used inside vscode copilot

A lot of folks like to build AI workflows using [LangGraph](https://github.com/langchain-ai/langgraphjs). This weekend, I decided to try and build a toy VSCode extension using LangGraph and the vscode [chatParticipant](https://code.visualstudio.com/api/references/vscode-api#LanguageModelAccess.chatRequest) interfaces. It turns out it is not that complicated. I just need to port a `ChatCopilot` class to the [BaseChatModel](https://python.langchain.com/api_reference/core/language_models/langchain_core.language_models.chat_models.BaseChatModel.html) interface. The only tricky part is that there is not much materials out there to learn about how vscode API actually works behind the scenes. I had to read few repository source code to figure out.

Few things I learned:

- It is best practice to define the tools in the `package.json` but you don't really have to if you are just try to interact with the LLM.
- The vscode message API only have two roles `user` and `assistant`. So `system` messages should be provided inside the `user` message.
- The `temperature` or `topP` settings does not seems to work with the [chatRequest]([chatParticipant](https://code.visualstudio.com/api/references/vscode-api#LanguageModelAccess.chatRequest)) API.
- [vscode-chat-extension](https://github.com/microsoft/vscode-chat-extension-utils) is a good reference to understand how the vscode LLM API works. And [chatParticipantHandler](https://github.com/microsoft/vscode-chat-extension-utils/blob/main/src/chatParticipantHandler.ts#L238) is actually simple agentic loop to work with tools.
- [vscode-prompt-tsx](https://github.com/microsoft/vscode-prompt-tsx) has prompt renderer to help organize the prompt more efficiently using tsx templates.