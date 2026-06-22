/**
 * SessionList 组件
 *
 * 可滚动的会话列表，每项显示标题、更新时间，hover 显示删除按钮
 */

import { DeleteOutlined } from "@ant-design/icons"
import { message, Popconfirm } from "antd"
import dayjs from "dayjs"

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
	onDelete: (id: string) => Promise<boolean>
}

function formatTime(timestamp: number): string {
	return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")
}

export function SessionList({ sessions, activeId, onSelect, onDelete }: SessionListProps) {
	const [messageApi, contextHolder] = message.useMessage()

	const handleDelete = async (id: string) => {
		const success = await onDelete(id)
		if (success) {
			messageApi.success("已删除")
		} else {
			messageApi.error("删除失败")
		}
	}

	if (sessions.length === 0) {
		return <p className={styles.empty}>No conversations yet</p>
	}

	return (
		<div className={styles.list}>
			{contextHolder}
			{sessions.map((session) => (
				<div key={session.id} className={`${styles.item} ${session.id === activeId ? styles.itemActive : ""}`} onClick={() => onSelect(session.id)}>
					<div className={styles.itemContent}>
						<span className={styles.itemTitle}>{session.title}</span>
						<span className={styles.itemTime}>{formatTime(session.updatedAt)}</span>
					</div>
					<Popconfirm
						title="删除会话"
						description="确定要删除这个会话吗？"
						onConfirm={(e) => {
							e?.stopPropagation()
							handleDelete(session.id)
						}}
						onCancel={(e) => e?.stopPropagation()}
						okText="删除"
						cancelText="取消"
						okButtonProps={{ danger: true }}
					>
						<button
							className={styles.deleteBtn}
							onClick={(e) => e.stopPropagation()}
							aria-label="Delete session"
						>
							<DeleteOutlined />
						</button>
					</Popconfirm>
				</div>
			))}
		</div>
	)
}
