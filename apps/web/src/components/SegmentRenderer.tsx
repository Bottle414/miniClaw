/**
 * Segment 渲染器
 *
 * 根据 segment.type 分发渲染
 * TextSegment 渲染纯文本，未知类型渲染 fallback
 */

import type { Segment } from "../types/message"

interface SegmentRendererProps {
	segment: Segment
}

export function SegmentRenderer({ segment }: SegmentRendererProps) {
	switch (segment.type) {
		case "text":
			return <span>{segment.content}</span>
		case "image":
			return <img src={segment.url} alt={segment.alt ?? ""} />
		case "card":
			return (
				<div className="segment-card">
					<strong>{segment.title}</strong>
					<p>{segment.content}</p>
				</div>
			)
		default:
			return <span>[unsupported segment: {(segment as Segment).type}]</span>
	}
}
