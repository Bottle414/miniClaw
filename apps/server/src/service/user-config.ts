import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

/** 用户配置结构 */
export interface UserConfig {
	/** 称呼 */
	name: string
	/** 身份 */
	identity: string
	/** 你的详情 */
	detail: string
	/** 助手性格 */
	soul: string
	/** 当前模型 */
	model: string
	/** DeepSeek API Key */
	deepseekApiKey: string
	/** GLM API Key */
	glmApiKey: string
}

const defaultUserConfig: UserConfig = {
	name: "",
	identity: "",
	detail: "",
	soul: "",
	model: "deepseek-v4-flash",
	deepseekApiKey: "",
	glmApiKey: ""
}

/** 初始化 userConfigService */
export function initUserConfigService(projectRoot: string) {
	const configPath = path.join(projectRoot, "userConfig.json")

	async function readConfig(): Promise<UserConfig> {
		try {
			const content = await readFile(configPath, "utf-8")
			return { ...defaultUserConfig, ...(JSON.parse(content) as Partial<UserConfig>) }
		} catch {
			return { ...defaultUserConfig }
		}
	}

	async function writeConfig(config: UserConfig): Promise<void> {
		await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8")
	}

	return {
		async get(): Promise<UserConfig> {
			return readConfig()
		},
		async update(partial: Partial<UserConfig>): Promise<UserConfig> {
			const current = await readConfig()
			const updated = { ...current, ...partial }
			await writeConfig(updated)
			return updated
		}
	}
}

/**
 * 根据用户配置生成 userPrompt
 * 将称呼、身份、详情用模板字符串填入
 */
export function buildUserPrompt(config: UserConfig): string {
	if (!config.name && !config.identity && !config.detail) return ""

	const parts: string[] = ["## 用户信息"]

	if (config.name) {
		parts.push(`- 称呼：${config.name}`)
	}
	if (config.identity) {
		parts.push(`- 身份：${config.identity}`)
	}
	if (config.detail) {
		parts.push(`- 详情：${config.detail}`)
	}

	parts.push("")
	parts.push("请在对话中参考以上用户信息，用符合用户身份和偏好的方式回应。")

	return parts.join("\n")
}

/**
 * 根据用户配置生成 soulPrompt
 * 如果用户自定义了助手性格，则替换默认灵魂提示词
 */
export function buildSoulPrompt(config: UserConfig): string | undefined {
	if (!config.soul) return undefined
	return config.soul
}
