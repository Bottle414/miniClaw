/**
 * ToolsTab 组件
 *
 * 展示工具执行记录，支持折叠展开
 */

import { Collapse } from "antd"

import { useRuntimeStore } from "../../../stores/runtime-store"
import styles from "./index.module.css"

export function ToolsTab() {
	const { toolRecords } = useRuntimeStore()

	if (toolRecords.length === 0) {
		return <div className={styles.empty}>No tool calls yet</div>
	}

	const items = toolRecords.map((tool) => ({
		key: tool.toolCallId,
		label: (
			<div className={styles.toolHeader}>
				<span className={styles.toolName}>{tool.toolName}</span>
				{tool.isComplete && (
					<span className={`${styles.toolStatus} ${tool.success ? styles.toolStatusSuccess : styles.toolStatusError}`}>
						{tool.success ? "success" : "error"}
					</span>
				)}
				{!tool.isComplete && (
					<span className={styles.toolStatus}>running...</span>
				)}
			</div>
		),
		children: (
			<div className={styles.toolDetail}>
				{tool.arguments && (
					<>
						<div>Parameters:</div>
						<pre>{formatJson(tool.arguments)}</pre>
					</>
				)}
				{tool.result !== undefined && (
					<>
						<div>Result:</div>
						<pre>{tool.result}</pre>
					</>
				)}
			</div>
		)
	}))

	return (
		<div className={styles.toolList}>
			<Collapse items={items} size="small" />
		</div>
	)
}

function formatJson(str: string): string {
	try {
		return JSON.stringify(JSON.parse(str), null, 2)
	} catch {
		return str
	}
}
