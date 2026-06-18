/**
 * MemoryTab 组件
 *
 * 展示 Memory 状态：Summary、Facts、Context Messages 数量、Canonical Messages 数量
 */

import { useEffect, useState } from "react"

import { useChatStore } from "../../../stores/chat-store"
import type { MemoryState } from "../../../types/runtime"
import styles from "./index.module.css"

export function MemoryTab() {
	const { activeSessionId } = useChatStore()
	const [memory, setMemory] = useState<MemoryState | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!activeSessionId) {
			setMemory(null)
			return
		}

		setLoading(true)
		fetch(`/api/session/${activeSessionId}/memory`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setMemory(null)
				} else {
					setMemory(data as MemoryState)
				}
			})
			.catch(() => setMemory(null))
			.finally(() => setLoading(false))
	}, [activeSessionId])

	if (!activeSessionId) {
		return <div className={styles.empty}>No active session</div>
	}

	if (loading) {
		return <div className={styles.loading}>Loading...</div>
	}

	if (!memory) {
		return <div className={styles.empty}>No memory data</div>
	}

	return (
		<div>
			{memory.summaries.length > 0 && (
				<div className={styles.section}>
					<div className={styles.sectionTitle}>Summary</div>
					{memory.summaries.map((s, i) => (
						<div key={i} className={styles.summaryItem}>{s.summary}</div>
					))}
				</div>
			)}

			{memory.facts.length > 0 && (
				<div className={styles.section}>
					<div className={styles.sectionTitle}>Facts</div>
					{memory.facts.map((f, i) => (
						<div key={i} className={styles.factItem}>
							<span className={styles.factCategory}>{f.category}</span>
							<span>{f.content}</span>
						</div>
					))}
				</div>
			)}

			<div className={styles.section}>
				<div className={styles.sectionTitle}>Stats</div>
				<div className={styles.statItem}>
					<span className={styles.statLabel}>Context Messages</span>
					<span className={styles.statValue}>{memory.contextMessagesCount}</span>
				</div>
				<div className={styles.statItem}>
					<span className={styles.statLabel}>Canonical Messages</span>
					<span className={styles.statValue}>{memory.canonicalMessagesCount}</span>
				</div>
			</div>
		</div>
	)
}
