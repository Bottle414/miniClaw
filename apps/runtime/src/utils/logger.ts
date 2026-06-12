/**
 * 统一日志工具
 * 通过环境变量控制打印开关，按 infoType 分类
 */

/** ANSI 颜色码 */
const colors = new Map<string, string>([
	["black", "\x1b[30m"],
	["red", "\x1b[31m"],
	["green", "\x1b[32m"],
	["yellow", "\x1b[33m"],
	["blue", "\x1b[34m"],
	["magenta", "\x1b[35m"],
	["cyan", "\x1b[36m"],
	["white", "\x1b[37m"],
	["gray", "\x1b[90m"],
	["reset", "\x1b[0m"]
])

/** infoType 到环境变量的映射 */
const envMap = new Map<string, string>([["stream", "STREAMING_OUTPUT_DEBUG"]])

/**
 * 受控日志打印
 *
 * @param infoType - 日志分类，对应环境变量开关
 * @param color - 颜色名称
 * @param text - 标签文本
 * @param args - 附加参数，会 JSON 序列化
 * @param newline - 是否换行，默认 true；流式文本输出传 false
 */
export function logger(infoType: string, color: string, text: string, args?: unknown[], newline = true): void {
	const envKey = envMap.get(infoType)
	if (!envKey || process.env[envKey] !== "true") return

	const colorCode = colors.get(color) ?? ""
	const reset = colors.get("reset") ?? "\x1b[0m"
	const serialized = args?.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2))) ?? []

	if (newline) {
		console.log(`${colorCode}${text}${reset}`, ...serialized)
	} else {
		process.stdout.write(`${colorCode}${text}${reset}`)
	}
}
