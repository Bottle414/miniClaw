/**
 * PermissionTab 组件
 *
 * 权限配置：工具列表 + 权限编辑
 */

import { useEffect, useState } from "react"
import { Button, Divider, Input, message, Tag } from "antd"

import { useSettingsStore } from "../../../../stores/settings-store"
import styles from "./index.module.css"

export function PermissionTab() {
	const { tools, permission, updatePermission } = useSettingsStore()
	const [messageApi, contextHolder] = message.useMessage()

	// 本地 state 管理 TextArea 内容，避免 JSON 解析失败时无法输入
	const [text, setText] = useState(() => JSON.stringify(permission, null, 2))

	// 当 store 中的 permission 变化时（如从服务端加载），同步到本地
	useEffect(() => {
		setText(JSON.stringify(permission, null, 2))
	}, [permission])

	const handleSave = async () => {
		try {
			const parsed = JSON.parse(text)
			if (!Array.isArray(parsed.allow) || !Array.isArray(parsed.check) || !Array.isArray(parsed.deny)) {
				messageApi.error("JSON 格式错误：需要 allow、check、deny 三个数组")
				return
			}
			await updatePermission(parsed)
			messageApi.success("已保存")
		} catch {
			messageApi.error("JSON 格式错误，请检查语法")
		}
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
					value={text}
					onChange={(e) => setText(e.target.value)}
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
