/**
 * Stable stringify
 * 对 object key 排序后序列化，保证相同数据产生相同字符串
 * 数组保持原始顺序
 */
export function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_, val) => {
		if (val !== null && typeof val === "object" && !Array.isArray(val)) {
			const sorted: Record<string, unknown> = {}
			for (const key of Object.keys(val).sort()) {
				sorted[key] = val[key]
			}
			return sorted
		}
		return val
	})
}
