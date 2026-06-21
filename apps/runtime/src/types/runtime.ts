/**
 * Runtime 工厂类型定义
 *
 * 定义 createRuntime 的输入输出类型，
 * 作为 runtime 与外部界面之间的契约
 */

import type { Config } from "./config"
import type { ContextBuilderOptions, SessionCreateOptions, Session, SessionMetadata } from "../memory/types"
import type { RuntimeEvent } from "./event"
import type { PermissionConfig, MetricsSnapshot } from "./llm/tool"

/** Session 管理器接口，由 createSessionManager 返回。 */
interface SessionManager {
	create(options?: SessionCreateOptions): Promise<Session>
	load(sessionId: string): Promise<Session | null>
	save(session: Session): Promise<void>
	delete(sessionId: string): Promise<void>
	list(): Promise<SessionMetadata[]>
}

/** createRuntime 工厂选项。所有配置由调用方显式传入，不依赖 process.env。 */
export interface RuntimeOptions {
	/** LLM API Key。 */
	apiKey: string
	/** LLM API Base URL（可选，使用默认值）。 */
	baseUrl?: string
	/** 模型名称（可选，使用默认值）。 */
	model?: string
	/** 系统人格提示（可选）。 */
	soulPrompt?: string
	/** Session ID，用于加载已有 session（可选，不传则创建新 session）。 */
	sessionId?: string
	/** Session 名称（可选，创建新 session 时使用）。 */
	sessionName?: string
	/** Session 存储目录路径（必需，由调用方指定）。 */
	sessionsRoot: string
	/** 权限配置（可选，不传则使用默认配置 allow: ["*"]）。 */
	permissionConfig?: PermissionConfig
	/** 权限确认回调，check 类型工具执行前调用（可选，默认自动放行）。 */
	onPermissionCheck?: (toolName: string) => Promise<boolean>
	/** 指标更新回调，每次工具调用后推送最新快照（可选）。 */
	onMetricsUpdate?: (snapshot: MetricsSnapshot) => void
}

/** chat 方法参数选项。 */
export interface ChatOptions {
	/** 上下文构建选项，控制消息保留/摘要策略。 */
	contextOptions?: ContextBuilderOptions
}

/** createRuntime 返回的 Runtime 实例。 */
export interface Runtime {
	/** 执行一轮对话，返回 RuntimeEvent 流。 */
	chat(userInput: string, options?: ChatOptions): AsyncIterable<RuntimeEvent>
	/** Session 管理器。 */
	sessionManager: SessionManager
	/** 运行时配置（只读）。 */
	config: Config
}
