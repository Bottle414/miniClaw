/**
 * 单条聊天消息组件
 *
 * 根据 role 显示用户/助手气泡，遍历 segments 渲染
 */

import type { ChatMessage } from "../types/message"
import { SegmentRenderer } from "./SegmentRenderer"
import { StreamingIndicator } from "./StreamingIndicator"

interface ChatMessageProps {
	message: ChatMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isAssistant = message.role === "assistant"

	return (
		<div className={`chat-message ${message.role}`}>
			<div className="message-avatar">
				{isAssistant ? "AI" : "U"}
			</div>
			<div className="message-content">
				{message.segments.map((segment, i) => (
					<SegmentRenderer key={i} segment={segment} />
				))}
				{isAssistant && !message.isComplete && <StreamingIndicator />}
			</div>
		</div>
	)
}
