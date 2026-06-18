/**
 * EventsTab 组件
 *
 * 展示 ReAct 迭代时间线
 */

import { useRuntimeStore } from "../../../stores/runtime-store"
import type { RuntimePhase } from "../../../types/runtime"
import styles from "./index.module.css"

const phaseClassMap: Record<RuntimePhase, string> = {
	thinking: styles.phaseThinking,
	acting: styles.phaseActing,
	observing: styles.phaseObserving,
	deciding: styles.phaseDeciding
}

export function EventsTab() {
	const { iterations, loopEndReason, totalIterations } = useRuntimeStore()

	if (iterations.length === 0 && !loopEndReason) {
		return <div className={styles.empty}>No runtime events yet</div>
	}

	return (
		<div className={styles.timeline}>
			{iterations.map((iter) => (
				<div key={iter.iteration} className={styles.iteration}>
					<div className={styles.iterationHeader}>Iteration {iter.iteration}</div>
					<div className={styles.phaseList}>
						{iter.phases.map((phase, idx) => (
							<div key={idx} className={`${styles.phaseItem} ${phaseClassMap[phase] ?? ""}`}>
								{phase.charAt(0).toUpperCase() + phase.slice(1)}
							</div>
						))}
					</div>
				</div>
			))}
			{loopEndReason && (
				<div className={styles.loopEnd}>
					Loop ended: {loopEndReason} ({totalIterations} iterations)
				</div>
			)}
		</div>
	)
}
