/**
 * PermissionTab 组件
 *
 * 权限配置：工具列表 + 权限编辑
 */

import { Button, Divider, Input, message, Tag } from "antd"

import { useSettingsStore } from "../../../../stores/settings-store"
import styles from "./index.module.css"

export function PermissionTab() {
	const { tools, permission, updatePermission } = useSettingsStore()
	const [messageApi, contextHolder] = message.useMessage()

	const handleSave = async () => {
		await updatePermission(permission)
		messageApi.success("已保存")
	}

	return (
		<div className={styles.container}>
			{contextHolder}
			<h3 className={styles.sectionTitle}>权限</h3>
			<Divider className={styles.divider} />

			<div className={styles.toolSection}>
				<span className={styles.toolLabel}>现有工具：</span>
				<div className={styles.toolList}>
					{tools.map((tool) => (
						<Tag key={tool.name} className={styles.toolTag}>
							<span className={styles.toolName}>{tool.name}</span>
							<span className={styles.toolDesc}>{tool.description}</span>
						</Tag>
					))}
				</div>
			</div>

			<div className={styles.editorSection}>
				<div className={styles.editorLabel}>权限配置（JSON 格式）</div>
				<Input.TextArea
					rows={8}
					value={JSON.stringify(permission, null, 2)}
					onChange={(e) => {
						try {
							const parsed = JSON.parse(e.target.value)
							if (Array.isArray(parsed.allow) && Array.isArray(parsed.check) && Array.isArray(parsed.deny)) {
								useSettingsStore.setState({ permission: parsed })
							}
						} catch {}
					}}
					className={styles.editor}
					placeholder='{"allow": ["*"], "check": [], "deny": []}'
				/>
				<div className={styles.hint}>allow: 自动放行的工具名（支持 * 通配符）；check: 需确认的工具；deny: 禁止的工具</div>
			</div>

			<Button type="primary" onClick={handleSave} className={styles.saveBtn}>
				保存
			</Button>
		</div>
	)
}
