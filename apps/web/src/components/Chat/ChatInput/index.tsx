/**
 * ChatInput 组件
 *
 * 底部固定输入框 + 发送按钮 + 模型切换，使用 antd Input
 */

import { AudioOutlined, SendOutlined } from "@ant-design/icons"
import { Button, Input, Select, message } from "antd"
import { useEffect, useRef, useState } from "react"

import styles from "./index.module.css"
import { useSpeechRecognition } from "../../../hooks/speech"
import { useSettingsStore } from "../../../stores/settings-store"
import { useChatStore } from "../../../stores/chat-store"

/** 可选模型列表 */
const MODEL_OPTIONS = [
	{ value: "deepseek-v4-flash", label: "DeepSeek V4" },
	{ value: "glm-5.1", label: "GLM-5.1" }
]

interface ChatInputProps {
	/** 发送消息回调 */
	onSend: (content: string) => void
	/** 是否禁用（流式输出中） */
	disabled: boolean
}

type VoiceState = "idle" | "recording"

const voiceLabel: Record<VoiceState, string> = {
	idle: "语音输入",
	recording: "录制中"
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [value, setValue] = useState("")
	const [voiceState, setVoiceState] = useState<VoiceState>("idle")
	const baseValueRef = useRef("")
	const { userConfig, switchModel } = useSettingsStore()
	const activeSessionId = useChatStore((s) => s.activeSessionId)

	// 切换 session 时清空输入框
	useEffect(() => {
		setValue("")
	}, [activeSessionId])

	const { start, abort } = useSpeechRecognition(
		(text) => {
			setValue(baseValueRef.current + text)
		},
		() => {
			setVoiceState("idle")
		},
		() => {
			message.error("语音识别失败")
		}
	)

	const handleRecord = () => {
		if (voiceState === "recording") {
			abort()
		} else if (voiceState === "idle") {
			baseValueRef.current = value
			start()
			setVoiceState("recording")
		}
	}

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
			<div className={styles.inputRow}>
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
				<Button size="large" icon={<AudioOutlined />} onClick={handleRecord} loading={voiceState !== "idle"} disabled={false}>
					{voiceLabel[voiceState]}
				</Button>
			</div>
			<div className={styles.modelRow}>
				<Select
					value={userConfig.model}
					onChange={switchModel}
					options={MODEL_OPTIONS}
					size="small"
					variant="borderless"
					className={styles.modelSelect}
					popupMatchSelectWidth={false}
				/>
			</div>
		</div>
	)
}
