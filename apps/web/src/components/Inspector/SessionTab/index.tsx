/**
 * SessionTab 组件
 *
 * 展示 Session 元信息：ID、Created At、Updated At、Message Count
 */

import { useEffect, useState } from "react"

import { useChatStore } from "../../../stores/chat-store"
import type { SessionDetail } from "../../../types/runtime"
import styles from "./index.module.css"

export function SessionTab() {
	const { activeSessionId } = useChatStore()
	const [detail, setDetail] = useState<SessionDetail | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!activeSessionId) {
			setDetail(null)
			return
		}

		setLoading(true)
		fetch(`/api/session/${activeSessionId}`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setDetail(null)
				} else {
					setDetail(data as SessionDetail)
				}
			})
			.catch(() => setDetail(null))
			.finally(() => setLoading(false))
	}, [activeSessionId])

	if (!activeSessionId) {
		return <div className={styles.empty}>No active session</div>
	}

	if (loading) {
		return <div className={styles.loading}>Loading...</div>
	}

	if (!detail) {
		return <div className={styles.empty}>Session not found</div>
	}

	return (
		<div className={styles.detail}>
			<div className={styles.row}>
				<span className={styles.label}>Session ID</span>
				<span className={styles.value} title={detail.id}>{detail.id}</span>
			</div>
			<div className={styles.row}>
				<span className={styles.label}>Name</span>
				<span className={styles.value}>{detail.name}</span>
			</div>
			<div className={styles.row}>
				<span className={styles.label}>Created At</span>
				<span className={styles.value}>{formatTimestamp(detail.createdAt)}</span>
			</div>
			<div className={styles.row}>
				<span className={styles.label}>Updated At</span>
				<span className={styles.value}>{formatTimestamp(detail.updatedAt)}</span>
			</div>
			<div className={styles.row}>
				<span className={styles.label}>Message Count</span>
				<span className={styles.value}>{detail.messageCount}</span>
			</div>
		</div>
	)
}

function formatTimestamp(ts: string): string {
	try {
		return new Date(ts).toLocaleString("zh-CN")
	} catch {
		return ts
	}
}
