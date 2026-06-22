/**
 * PersonalizationTab 组件
 *
 * 个性化设置：称呼、身份、详情、助手性格
 */

import { useEffect } from "react"
import { Button, Divider, Form, Input, message } from "antd"

import { useSettingsStore } from "../../../../stores/settings-store"
import styles from "./index.module.css"

interface FormValues {
	name: string
	identity: string
	detail: string
	soul: string
}

export function PersonalizationTab() {
	const { userConfig, updateUserConfig } = useSettingsStore()
	const [form] = Form.useForm<FormValues>()
	const [messageApi, contextHolder] = message.useMessage()

	// 当 userConfig 从服务端加载后，同步到 Form
	useEffect(() => {
		form.setFieldsValue(userConfig)
	}, [userConfig, form])

	const handleSave = async (values: FormValues) => {
		await updateUserConfig(values)
		messageApi.success("已保存")
	}

	return (
		<div className={styles.container}>
			{contextHolder}
			<h3 className={styles.sectionTitle}>关于你</h3>
			<Divider className={styles.divider} />
			<Form form={form} layout="vertical" initialValues={userConfig} onFinish={handleSave} className={styles.form}>
				<Form.Item label="称呼" name="name">
					<Input placeholder="你希望助手怎么称呼你" />
				</Form.Item>
				<Form.Item label="身份" name="identity">
					<Input placeholder="你的职业或身份，如：前端工程师" />
				</Form.Item>
				<Form.Item label="你的详情" name="detail">
					<Input.TextArea rows={3} placeholder="关于你的更多信息，帮助助手更好地了解你" />
				</Form.Item>

				<h3 className={styles.sectionTitle}>助手性格</h3>
				<Divider className={styles.divider} />
				<Form.Item name="soul">
					<Input.TextArea rows={6} placeholder="自定义助手的人格和说话风格。留空则使用默认性格" />
				</Form.Item>

				<Form.Item>
					<Button type="primary" htmlType="submit">
						保存
					</Button>
				</Form.Item>
			</Form>
		</div>
	)
}
