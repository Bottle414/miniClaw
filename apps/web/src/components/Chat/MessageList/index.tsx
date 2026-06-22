/**
 * MessageList 组件
 *
 * 可滚动消息列表，智能自动滚动：
 * - 默认自动滚到底部
 * - 用户向上滚动超过 30px 时暂停自动滚动
 * - 用户滚回距底部 30px 以内时恢复自动滚动
 */

import { useCallback, useEffect, useRef } from "react"

import type { ChatMessage } from "../../../types/message"
import { ChatMessage as ChatMessageComponent } from "../ChatMessage"
import styles from "./index.module.css"

/** 距底部阈值，超过此值暂停自动滚动 */
const SCROLL_THRESHOLD = 10

interface MessageListProps {
	/** 消息列表 */
	messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const bottomRef = useRef<HTMLDivElement>(null)
	const autoScrollRef = useRef(true)

	const isNearBottom = useCallback(() => {
		const el = containerRef.current
		if (!el) return true
		return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD
	}, [])

	const handleScroll = useCallback(() => {
		autoScrollRef.current = isNearBottom()
	}, [isNearBottom])

	useEffect(() => {
		if (autoScrollRef.current) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" })
		}
	}, [messages])

	if (messages.length === 0) {
		return <div className={styles.empty}>Send a message to start</div>
	}

	return (
		<div className={styles.messageList} ref={containerRef} onScroll={handleScroll}>
			{messages.map((msg) => (
				<ChatMessageComponent key={msg.id} message={msg} />
			))}
			<div ref={bottomRef} />
		</div>
	)
}
