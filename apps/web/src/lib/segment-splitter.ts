/**
 * Segment 拆分器
 *
 * 将消息文本内容用正则拆分为 Segment 数组
 * 当前仅支持 TextSegment，架构预留 image/card 扩展
 */

import type { Segment, TextSegment } from "../types/message"

/**
 * 将文本内容拆分为 Segment 数组
 *
 * 当前实现：整体匹配为 TextSegment
 * 未来可扩展：匹配 ![alt](url) 为 ImageSegment，匹配 {{card:...}} 为 CardSegment
 */
export function splitSegments(content: string): Segment[] {
	if (!content) return []

	// 当前：整体作为一个 TextSegment
	// 未来扩展时，在此处添加正则匹配逻辑
	const segment: TextSegment = { type: "text", content }
	return [segment]
}
