/**
 * ChatMessage 组件
 *
 * 单条聊天消息气泡，Assistant/User 不同背景色
 */

import type { ChatMessage as ChatMessageType } from "../../../types/message"
import { StreamingIndicator } from "../StreamingIndicator"
import styles from "./index.module.css"

interface ChatMessageProps {
  /** 消息数据 */
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`${styles.message} ${isUser ? styles.messageUser : ""}`}>
      <div className={`${styles.avatar} ${isUser ? styles.avatarUser : styles.avatarAssistant}`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`${styles.content} ${isUser ? styles.contentUser : styles.contentAssistant}`}>
        {message.content}
        {!message.isComplete && <StreamingIndicator />}
      </div>
    </div>
  )
}
