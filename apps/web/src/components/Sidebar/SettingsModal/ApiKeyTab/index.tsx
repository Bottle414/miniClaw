/**
 * ApiKeyTab 组件
 *
 * API Key 配置：DeepSeek / GLM
 * 已配置的 Key 显示为 **********，输入新值时为明文
 */

import { useEffect } from "react"
import { Button, Divider, Form, Input, message } from "antd"

import { useSettingsStore } from "../../../../stores/settings-store"
import styles from "../PersonalizationTab/index.module.css"

/** 服务端返回的脱敏掩码 */
const MASK = "**********"

interface FormValues {
	deepseekApiKey: string
	glmApiKey: string
}

export function ApiKeyTab() {
	const { userConfig, updateUserConfig } = useSettingsStore()
	const [form] = Form.useForm<FormValues>()
	const [messageApi, contextHolder] = message.useMessage()

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
			<h3 className={styles.sectionTitle}>API_KEY</h3>
			<Divider className={styles.divider} />
			<Form form={form} layout="vertical" initialValues={userConfig} onFinish={handleSave} className={styles.form}>
				<Form.Item label="DeepSeek" name="deepseekApiKey">
					<Input placeholder={MASK} />
				</Form.Item>
				<Form.Item label="GLM" name="glmApiKey">
					<Input placeholder={MASK} />
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
