# Can Langgraphjs be used inside vscode copilot

A lot of folks like to build AI workflows using [LangGraph](https://github.com/langchain-ai/langgraphjs). This weekend, I decided to try and build a toy VSCode extension using LangGraph and the vscode [chatParticipant](https://code.visualstudio.com/api/references/vscode-api#LanguageModelAccess.chatRequest) interfaces. It turns out it is not that complicated. I just need to port a `ChatCopilot` class to the [BaseChatModel](https://python.langchain.com/api_reference/core/language_models/langchain_core.language_models.chat_models.BaseChatModel.html) interface. The only tricky part is that there is not much materials out there to learn about how vscode API actually works behind the scenes. I had to read few repository source code to figure out.

Few things I learned:

1.