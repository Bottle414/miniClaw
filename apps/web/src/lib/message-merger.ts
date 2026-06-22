/**
 * 消息合并器
 *
 * 将 streaming chunk（text-delta）合并为结构化 ChatMessage
 * 非完整消息持续更新，完整消息后新建消息继续合并
 */

import type { ChatMessage } from "../types/message"
import { splitSegments } from "./segment-splitter"

let nextId = 0

/** 生成唯一消息 ID */
function createId(): string {
	return `msg-${++nextId}`
}

/** 创建用户消息 */
export function createUserMessage(content: string): ChatMessage {
	return {
		id: createId(),
		role: "user",
		content,
		segments: splitSegments(content),
		isComplete: true
	}
}

/** 创建助手消息（流式开始） */
export function createAssistantMessage(delta: string): ChatMessage {
	return {
		id: createId(),
		role: "assistant",
		content: delta,
		segments: splitSegments(delta),
		isComplete: false
	}
}

/** 创建带思考内容的助手消息 */
export function createAssistantMessageWithReasoning(reasoning: string): ChatMessage {
	return {
		id: createId(),
		role: "assistant",
		content: "",
		segments: [],
		reasoning,
		isComplete: false
	}
}

/**
 * 将 text-delta 追加到当前助手消息
 * 返回更新后的消息
 */
export function appendDelta(message: ChatMessage, delta: string): ChatMessage {
	const content = message.content + delta
	return {
		...message,
		content,
		segments: splitSegments(content),
		isComplete: false
	}
}

/**
 * 将 reasoning-delta 追加到当前助手消息的思考内容
 * 返回更新后的消息
 */
export function appendReasoningDelta(message: ChatMessage, delta: string): ChatMessage {
	return {
		...message,
		reasoning: (message.reasoning ?? "") + delta,
		isComplete: false
	}
}

/**
 * 标记消息为已完成
 */
export function completeMessage(message: ChatMessage): ChatMessage {
	return { ...message, isComplete: true }
}

/**
 * 处理一个 RuntimeEvent，更新消息列表
 *
 * - reasoning-delta: 追加到当前未完成助手消息的思考内容，若无则新建
 * - text-delta: 追加到当前未完成助手消息，若无则新建
 * - finish: 标记当前 LLM 回合结束（不关闭消息，多轮思考可继续追加）
 * - loop-complete: 标记当前消息完成
 * - 其他事件: 不影响消息列表
 *
 * 返回更新后的消息列表
 */
export function processEvent(messages: ChatMessage[], event: { type: string; delta?: string }): ChatMessage[] {
	switch (event.type) {
		case "reasoning-delta": {
			const delta = (event as { type: "reasoning-delta"; delta: string }).delta
			const lastMessage = messages[messages.length - 1]

			// 如果最后一条是未完成的助手消息，追加思考内容
			if (lastMessage?.role === "assistant" && !lastMessage.isComplete) {
				return [...messages.slice(0, -1), appendReasoningDelta(lastMessage, delta)]
			}

			// 否则新建带思考内容的助手消息
			return [...messages, createAssistantMessageWithReasoning(delta)]
		}

		case "text-delta": {
			const delta = (event as { type: "text-delta"; delta: string }).delta
			const lastMessage = messages[messages.length - 1]

			// 如果最后一条是未完成的助手消息，追加
			if (lastMessage?.role === "assistant" && !lastMessage.isComplete) {
				return [...messages.slice(0, -1), appendDelta(lastMessage, delta)]
			}

			// 否则新建助手消息
			return [...messages, createAssistantMessage(delta)]
		}

		case "loop-complete": {
			const lastMessage = messages[messages.length - 1]
			if (lastMessage?.role === "assistant" && !lastMessage.isComplete) {
				return [...messages.slice(0, -1), completeMessage(lastMessage)]
			}
			return messages
		}

		default:
			return messages
	}
}
