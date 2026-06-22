/**
 * Sidebar 组件
 *
 * 可展开折叠的会话侧边栏，包含图标列和 Session 列表
 */

import { useChatStore } from "../../stores/chat-store"
import { useUIStore } from "../../stores/ui-store"
import { useRuntimeStore } from "../../stores/runtime-store"
import { resetRuntimeEventProcessor } from "../../lib/runtime-event-processor"
import { SidebarIcons } from "./SidebarIcons"
import { SessionList } from "./SessionList"
import styles from "./index.module.css"

interface SidebarProps {
	/** 是否展开 */
	open: boolean
}

export function Sidebar({ open }: SidebarProps) {
	const { sessions, activeSessionId, selectSession, deleteSession, newChat } = useChatStore()
	const { toggleSidebar } = useUIStore()
	const { clearRuntime } = useRuntimeStore()

	const handleNewChat = () => {
		newChat()
		clearRuntime()
		resetRuntimeEventProcessor()
	}

	const handleDelete = async (id: string): Promise<boolean> => {
		return deleteSession(id)
	}

	return (
		<aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
			<SidebarIcons open={open} onNewChat={handleNewChat} onToggle={toggleSidebar} />
			{open && <SessionList sessions={sessions} activeId={activeSessionId} onSelect={selectSession} onDelete={handleDelete} />}
		</aside>
	)
}
