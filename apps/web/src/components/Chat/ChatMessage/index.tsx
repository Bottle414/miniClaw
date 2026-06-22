/**
 * ChatMessage 组件
 *
 * 单条聊天消息气泡，Assistant/User 不同背景色
 * Assistant 消息包含思考过程时使用 Collapse 展示
 */

import { useState } from "react"
import { Collapse } from "antd"
import type { ChatMessage as ChatMessageType } from "../../../types/message"
import { StreamingIndicator } from "../StreamingIndicator"
import styles from "./index.module.css"

interface ChatMessageProps {
	/** 消息数据 */
	message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isUser = message.role === "user"
	const hasReasoning = !isUser && message.reasoning

	// 思考中展开，思考完毕自动折叠；用户手动操作后不再自动折叠
	const [manuallyTouched, setManuallyTouched] = useState(false)
	const activeKey = manuallyTouched ? undefined : message.isComplete ? [] : ["reasoning"]

	return (
		<div className={`${styles.message} ${isUser ? styles.messageUser : ""}`}>
			<div className={`${styles.avatar} ${isUser ? styles.avatarUser : styles.avatarAssistant}`}>{isUser ? "U" : "AI"}</div>
			<div className={`${styles.content} ${isUser ? styles.contentUser : styles.contentAssistant}`}>
				{hasReasoning && (
					<Collapse
						className={styles.reasoningCollapse}
						activeKey={activeKey}
						onChange={() => setManuallyTouched(true)}
						items={[
							{
								key: "reasoning",
								label: message.isComplete ? "思考过程" : "思考中…",
								children: <pre className={styles.reasoningContent}>{message.reasoning}</pre>
							}
						]}
					/>
				)}
				{message.content}
				{!message.isComplete && <StreamingIndicator />}
			</div>
		</div>
	)
}
