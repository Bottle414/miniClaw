/**
 * Inspector 组件
 *
 * Runtime Inspector 面板，包含 Events/Tools/Memory/Session 四个 Tab
 */

import { CloseOutlined } from "@ant-design/icons"
import { Tabs } from "antd"

import { useUIStore } from "../../stores/ui-store"
import { EventsTab } from "./EventsTab"
import { ToolsTab } from "./ToolsTab"
import { MemoryTab } from "./MemoryTab"
import { SessionTab } from "./SessionTab"
import styles from "./index.module.css"

export function Inspector() {
	const { toggleInspector } = useUIStore()

	const items = [
		{ key: "events", label: "Events", children: <EventsTab /> },
		{ key: "tools", label: "Tools", children: <ToolsTab /> },
		{ key: "memory", label: "Memory", children: <MemoryTab /> },
		{ key: "session", label: "Session", children: <SessionTab /> }
	]

	return (
		<div className={styles.inspector}>
			<div className={styles.header}>
				<h3 className={styles.headerTitle}>Runtime Inspector</h3>
				<button className={styles.closeBtn} onClick={toggleInspector} aria-label="Close inspector">
					<CloseOutlined />
				</button>
			</div>
			<div className={styles.tabs}>
				<Tabs defaultActiveKey="events" centered items={items} size="small" />
			</div>
		</div>
	)
}
