/**
 * ChatInput 组件
 *
 * 底部固定输入框 + 发送按钮，使用 antd Input
 */

import { SendOutlined } from "@ant-design/icons"
import { Input } from "antd"
import { useState } from "react"

import styles from "./index.module.css"

interface ChatInputProps {
	/** 发送消息回调 */
	onSend: (content: string) => void
	/** 是否禁用（流式输出中） */
	disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [value, setValue] = useState("")

	const handleSubmit = () => {
		const trimmed = value.trim()
		if (!trimmed || disabled) return
		onSend(trimmed)
		setValue("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<div className={styles.inputArea}>
			<Input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Send a message..."
				disabled={disabled}
				size="large"
				style={{ borderRadius: 24, flex: 1, height: 50 }}
			/>
			<button className={styles.sendBtn} onClick={handleSubmit} disabled={disabled || !value.trim()} aria-label="Send message">
				<SendOutlined />
			</button>
		</div>
	)
}
