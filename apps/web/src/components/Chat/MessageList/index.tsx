/**
 * MessageList 组件
 *
 * 可滚动消息列表，自动滚动到底部
 */

import { useEffect, useRef } from "react"

import type { ChatMessage } from "../../../types/message"
import { ChatMessage as ChatMessageComponent } from "../ChatMessage"
import styles from "./index.module.css"

interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return <div className={styles.empty}>Send a message to start</div>
  }

  return (
    <div className={styles.messageList}>
      {messages.map((msg) => (
        <ChatMessageComponent key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
