/**
 * Web UI 会话类型定义
 *
 * ChatSession 表示侧边栏中的一个聊天会话条目
 */

export interface ChatSession {
	/** 唯一标识 */
	id: string
	/** 会话标题（取自第一条用户消息） */
	title: string
	/** 最后更新时间戳 */
	updatedAt: number
}
