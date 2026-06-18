/**
 * SidebarIcons 组件
 *
 * Sidebar 顶部的图标列：Logo、New Chat、搜索框、折叠按钮
 * 折叠时搜索框显示为 SearchOutlined 图标，点击弹出 Modal
 */

import { PlusOutlined, MenuFoldOutlined, SearchOutlined, RobotOutlined } from "@ant-design/icons"
import { Input, Modal, Tooltip } from "antd"
import { useState } from "react"

import styles from "./index.module.css"

interface SidebarIconsProps {
	/** 是否展开 */
	open: boolean
	/** 新建会话 */
	onNewChat: () => void
	/** 折叠/展开切换 */
	onToggle: () => void
}

export function SidebarIcons({ open, onNewChat, onToggle }: SidebarIconsProps) {
	const [searchModalOpen, setSearchModalOpen] = useState(false)

	return (
		<>
			<div className={styles.logo}>
				<RobotOutlined className={styles.logoIcon} />
				{open && <span>miniClaw</span>}
			</div>
			<div className={styles.iconsContainer}>
				<Tooltip title={open ? undefined : "New Chat"} placement="right">
					<button className={styles.iconButton} onClick={onNewChat}>
						<PlusOutlined />
						{open && <span className={styles.iconLabel}>New Chat</span>}
					</button>
				</Tooltip>

				{open ? (
					<Input className={styles.searchInput} placeholder="Search sessions..." prefix={<SearchOutlined />} size="medium" allowClear disabled />
				) : (
					<Tooltip title="Search sessions" placement="right">
						<button className={styles.iconButton} onClick={() => setSearchModalOpen(true)}>
							<SearchOutlined />
						</button>
					</Tooltip>
				)}

				<Tooltip title={open ? "折叠边栏" : "展开边栏"} placement="right">
					<button className={styles.iconButton} onClick={onToggle}>
						<MenuFoldOutlined />
						{open && <span className={styles.iconLabel}>折叠边栏</span>}
					</button>
				</Tooltip>
			</div>

			<Modal title="Search Sessions" open={searchModalOpen} onCancel={() => setSearchModalOpen(false)} footer={null} width={600}>
				<Input placeholder="Search sessions..." prefix={<SearchOutlined />} size="large" allowClear disabled style={{ marginBottom: 16 }} />
				<div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: 16 }}>Search functionality coming soon</div>
			</Modal>
		</>
	)
}
