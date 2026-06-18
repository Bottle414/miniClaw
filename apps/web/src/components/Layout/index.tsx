/**
 * Layout 组件
 *
 * 三栏布局：左侧 Sidebar + 中间 Chat + 右侧 Inspector
 */

import { useUIStore } from "../../stores/ui-store"
import { Sidebar } from "../Sidebar"
import { Chat } from "../Chat"
import { Inspector } from "../Inspector"
import styles from "./index.module.css"

function Layout() {
	const { sidebarOpen, inspectorOpen } = useUIStore()

	return (
		<div className={styles.container}>
			<Sidebar open={sidebarOpen} />
			<main className={styles.main}>
				<Chat />
			</main>
			{inspectorOpen && <Inspector />}
		</div>
	)
}

export { Layout }
