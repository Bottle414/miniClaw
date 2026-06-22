/**
 * Settings Store
 *
 * 管理用户配置和权限配置的状态
 */

import { create } from "zustand"

/** 用户配置 */
export interface UserConfig {
	name: string
	identity: string
	detail: string
	soul: string
}

/** 工具信息 */
export interface ToolInfo {
	name: string
	description: string
}

/** 权限配置 */
export interface PermissionConfig {
	allow: string[]
	check: string[]
	deny: string[]
}

interface SettingsState {
	/** 用户配置 */
	userConfig: UserConfig
	/** 工具列表 */
	tools: ToolInfo[]
	/** 权限配置 */
	permission: PermissionConfig
	/** 是否正在加载 */
	loading: boolean
	/** 设置 Modal 是否打开 */
	modalOpen: boolean

	/** 加载用户配置 */
	loadUserConfig: () => Promise<void>
	/** 更新用户配置 */
	updateUserConfig: (config: Partial<UserConfig>) => Promise<void>
	/** 加载工具列表 */
	loadTools: () => Promise<void>
	/** 加载权限配置 */
	loadPermission: () => Promise<void>
	/** 更新权限配置 */
	updatePermission: (config: PermissionConfig) => Promise<void>
	/** 切换 Modal */
	setModalOpen: (open: boolean) => void
}

const defaultUserConfig: UserConfig = {
	name: "",
	identity: "",
	detail: "",
	soul: ""
}

const defaultPermission: PermissionConfig = {
	allow: ["*"],
	check: [],
	deny: []
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	userConfig: { ...defaultUserConfig },
	tools: [],
	permission: { ...defaultPermission },
	loading: false,
	modalOpen: false,

	loadUserConfig: async () => {
		try {
			const res = await fetch("/api/user-config")
			if (res.ok) {
				const data = await res.json()
				set({ userConfig: { ...defaultUserConfig, ...data } })
			}
		} catch {
			// 使用默认值
		}
	},

	updateUserConfig: async (config) => {
		const current = get().userConfig
		const updated = { ...current, ...config }
		set({ userConfig: updated })
		try {
			await fetch("/api/user-config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updated)
			})
		} catch {
			// 静默失败
		}
	},

	loadTools: async () => {
		try {
			const res = await fetch("/api/tools")
			if (res.ok) {
				const data = await res.json()
				set({ tools: data.tools ?? [] })
			}
		} catch {
			// 使用默认值
		}
	},

	loadPermission: async () => {
		try {
			const res = await fetch("/api/permission")
			if (res.ok) {
				const data = await res.json()
				set({ permission: { ...defaultPermission, ...data } })
			}
		} catch {
			// 使用默认值
		}
	},

	updatePermission: async (config) => {
		set({ permission: config })
		try {
			await fetch("/api/permission", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config)
			})
		} catch {
			// 静默失败
		}
	},

	setModalOpen: (open) => {
		set({ modalOpen: open })
	}
}))
