/**
 * 消息列表组件
 *
 * 渲染消息列表，auto-scroll 到最新消息
 */

import { useEffect, useRef } from "react"
import type { ChatMessage } from "../types/message"
import { ChatMessage as ChatMessageComponent } from "./ChatMessage"

interface MessageListProps {
	messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages])

	return (
		<div className="message-list">
			{messages.map((msg) => (
				<ChatMessageComponent key={msg.id} message={msg} />
			))}
			<div ref={bottomRef} />
		</div>
	)
}
