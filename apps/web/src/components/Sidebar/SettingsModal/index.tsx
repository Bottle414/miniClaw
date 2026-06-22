/**
 * SettingsModal 组件
 *
 * 设置弹窗，包含个性化和权限配置两个 Tab
 */

import { useEffect } from "react"
import { Modal, Tabs } from "antd"

import { useSettingsStore } from "../../../stores/settings-store"
import { PersonalizationTab } from "./PersonalizationTab"
import { PermissionTab } from "./PermissionTab"
import styles from "./index.module.css"

interface SettingsModalProps {
	/** 是否打开 */
	open: boolean
	/** 关闭回调 */
	onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
	const { loadUserConfig, loadPermission, loadTools } = useSettingsStore()

	useEffect(() => {
		if (open) {
			loadUserConfig()
			loadPermission()
			loadTools()
		}
	}, [open, loadUserConfig, loadPermission, loadTools])

	const tabItems = [
		{
			key: "personalization",
			label: "个性化",
			children: <PersonalizationTab />
		},
		{
			key: "permission",
			label: "权限配置",
			children: <PermissionTab />
		}
	]

	return (
		<Modal title="设置" open={open} onCancel={onClose} footer={null} width={680} destroyOnHidden>
			<Tabs size="large" tabPosition="left" items={tabItems} className={styles.tabs} />
		</Modal>
	)
}
