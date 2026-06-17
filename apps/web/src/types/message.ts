/**
 * Web UI 消息与 Segment 类型定义
 *
 * ChatMessage 表示一条聊天消息，Segment 是消息内容的结构化拆分单元
 */

// ============== Segment Types ==============

/** 文本 Segment */
export interface TextSegment {
	type: "text"
	content: string
}

/** 图片 Segment（预留） */
export interface ImageSegment {
	type: "image"
	url: string
	alt?: string
}

/** 卡片 Segment（预留） */
export interface CardSegment {
	type: "card"
	title: string
	content: string
}

/** Segment 联合类型 */
export type Segment = TextSegment | ImageSegment | CardSegment

// ============== Message Types ==============

/** 消息角色 */
export type MessageRole = "user" | "assistant"

/** 聊天消息 */
export interface ChatMessage {
	/** 唯一标识 */
	id: string
	/** 消息角色 */
	role: MessageRole
	/** 原始文本内容 */
	content: string
	/** 结构化拆分后的 segments */
	segments: Segment[]
	/** 消息是否已完成（流式结束后标记为 true） */
	isComplete: boolean
}
