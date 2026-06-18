/**
 * Chat 组件
 *
 * 聊天区域主组件：Header + MessageList + ChatInput，消息居中容器
 */

import { CodeOutlined } from "@ant-design/icons"
import { Tooltip } from "antd"

import { useChatStore } from "../../stores/chat-store"
import { useUIStore } from "../../stores/ui-store"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import styles from "./index.module.css"

export function Chat() {
  const { messages, isStreaming, sendMessage } = useChatStore()
  const { inspectorOpen, toggleInspector } = useUIStore()

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1>miniClaw</h1>
        {!inspectorOpen && (
          <Tooltip title="Open Runtime Inspector">
            <button className={styles.inspectorBtn} onClick={toggleInspector} aria-label="Open inspector">
              <CodeOutlined />
            </button>
          </Tooltip>
        )}
      </header>
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}
