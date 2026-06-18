/**
 * SessionList 组件
 *
 * 可滚动的会话列表，每项显示标题、更新时间，hover 显示删除按钮
 */

import { DeleteOutlined } from "@ant-design/icons"

import type { ChatSession } from "../../../types/session"
import styles from "./index.module.css"

interface SessionListProps {
	/** 会话列表 */
	sessions: ChatSession[]
	/** 当前活跃会话 ID */
	activeId: string | null
	/** 选择会话 */
	onSelect: (id: string) => void
	/** 删除会话 */
	onDelete: (id: string) => void
}

function formatTime(timestamp: number): string {
	const date = new Date(timestamp)
	const now = new Date()
	const isToday = date.toDateString() === now.toDateString()
	if (isToday) {
		return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
	}
	return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export function SessionList({ sessions, activeId, onSelect, onDelete }: SessionListProps) {
	if (sessions.length === 0) {
		return <p className={styles.empty}>No conversations yet</p>
	}

	return (
		<div className={styles.list}>
			{sessions.map((session) => (
				<div key={session.id} className={`${styles.item} ${session.id === activeId ? styles.itemActive : ""}`} onClick={() => onSelect(session.id)}>
					<div className={styles.itemContent}>
						<span className={styles.itemTitle}>{session.title}</span>
						<span className={styles.itemTime}>{formatTime(session.updatedAt)}</span>
					</div>
					<button
						className={styles.deleteBtn}
						onClick={(e) => {
							e.stopPropagation()
							onDelete(session.id)
						}}
						aria-label="Delete session"
					>
						<DeleteOutlined />
					</button>
				</div>
			))}
		</div>
	)
}
