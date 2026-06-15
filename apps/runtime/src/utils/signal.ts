/**
 * 合并多个 AbortSignal
 * 任一输入 signal 被 abort 时，返回的 signal 也被 abort
 */
export function anySignal(signals: (AbortSignal | undefined)[]): AbortSignal {
	const controller = new AbortController()

	for (const signal of signals) {
		if (!signal) continue
		if (signal.aborted) {
			controller.abort(signal.reason)
			return controller.signal
		}
		signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true })
	}

	return controller.signal
}
