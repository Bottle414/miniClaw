/**
 * miniClaw Web UI
 *
 * AI Chat 界面，组装消息列表与输入框
 */

import { ChatInput } from "./components/ChatInput"
import { MessageList } from "./components/MessageList"
import { useChat } from "./hooks/useChat"
import "./App.css"

function App() {
	const { messages, isStreaming, sendMessage } = useChat()

	return (
		<div className="chat-app">
			<header className="chat-header">
				<h1>miniClaw</h1>
			</header>
			<MessageList messages={messages} />
			<ChatInput onSend={sendMessage} disabled={isStreaming} />
		</div>
	)
}

export default App
