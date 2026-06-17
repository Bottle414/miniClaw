/**
 * 聊天输入组件
 *
 * 药丸形输入框 + 圆形发送按钮，Enter 提交，空消息拦截
 */

import { useState } from "react"

interface ChatInputProps {
	onSend: (message: string) => void
	disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [input, setInput] = useState("")

	function handleSubmit() {
		const trimmed = input.trim()
		if (!trimmed || disabled) return
		onSend(trimmed)
		setInput("")
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<div className="chat-input">
			<input
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Send a message..."
				disabled={disabled}
			/>
			<button onClick={handleSubmit} disabled={disabled || !input.trim()} aria-label="Send">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
					<line x1="12" y1="19" x2="12" y2="5" />
					<polyline points="5 12 12 5 19 12" />
				</svg>
			</button>
		</div>
	)
}
