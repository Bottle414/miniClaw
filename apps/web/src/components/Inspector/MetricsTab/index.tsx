/**
 * MetricsTab 组件
 *
 * 展示每个工具的调用指标：调用次数、错误率、平均耗时等
 */

import { useEffect, useState } from "react"

import { useChatStore } from "../../../stores/chat-store"
import type { MetricsState, ToolMetricsData } from "../../../types/runtime"
import styles from "./index.module.css"

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(iso: string): string {
	if (!iso) return "-"
	const d = new Date(iso)
	return d.toLocaleTimeString()
}

function ToolMetricsCard({ name, metrics }: { name: string; metrics: ToolMetricsData }) {
	const errorRate = metrics.callCount > 0 ? ((metrics.errorCount / metrics.callCount) * 100).toFixed(1) : "0.0"
	const cacheTotal = metrics.cacheHits + metrics.cacheMisses
	const cacheHitRate = cacheTotal > 0 ? ((metrics.cacheHits / cacheTotal) * 100).toFixed(0) : "-"

	return (
		<div className={styles.toolCard}>
			<div className={styles.toolCardHeader}>
				<span className={styles.toolCardName}>{name}</span>
				<span className={styles.toolCardCalls}>{metrics.callCount} calls</span>
			</div>
			<div className={styles.toolCardGrid}>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Avg Duration</span>
					<span className={styles.metricValue}>{formatDuration(metrics.avgDurationMs)}</span>
				</div>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Total Duration</span>
					<span className={styles.metricValue}>{formatDuration(metrics.totalDurationMs)}</span>
				</div>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Error Rate</span>
					<span className={`${styles.metricValue} ${Number(errorRate) > 0 ? styles.metricError : ""}`}>{errorRate}%</span>
				</div>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Cache Hit</span>
					<span className={styles.metricValue}>{cacheHitRate}{cacheHitRate !== "-" ? "%" : ""}</span>
				</div>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Timeouts</span>
					<span className={styles.metricValue}>{metrics.timeoutCount}</span>
				</div>
				<div className={styles.metricItem}>
					<span className={styles.metricLabel}>Retries</span>
					<span className={styles.metricValue}>{metrics.retryCount}</span>
				</div>
			</div>
			<div className={styles.toolCardFooter}>
				Last called: {formatTime(metrics.lastCalledAt)}
			</div>
		</div>
	)
}

export function MetricsTab() {
	const { activeSessionId } = useChatStore()
	const [metrics, setMetrics] = useState<MetricsState | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!activeSessionId) {
			setMetrics(null)
			return
		}

		setLoading(true)
		fetch(`/api/session/${activeSessionId}/metrics`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setMetrics(null)
				} else {
					setMetrics(data as MetricsState)
				}
			})
			.catch(() => setMetrics(null))
			.finally(() => setLoading(false))
	}, [activeSessionId])

	if (!activeSessionId) {
		return <div className={styles.empty}>No active session</div>
	}

	if (loading) {
		return <div className={styles.loading}>Loading...</div>
	}

	if (!metrics || !metrics.tools || Object.keys(metrics.tools).length === 0) {
		return <div className={styles.empty}>No tool metrics yet</div>
	}

	return (
		<div className={styles.metricsList}>
			{Object.entries(metrics.tools).map(([name, data]) => (
				<ToolMetricsCard key={name} name={name} metrics={data} />
			))}
		</div>
	)
}
