/**
 * EventsTab 组件
 *
 * 展示 ReAct 迭代时间线，包含每个阶段的详细内容
 */

import { useRuntimeStore } from "../../../stores/runtime-store"
import type { PhaseRecord, RuntimePhase } from "../../../types/runtime"
import styles from "./index.module.css"

const phaseLabelMap: Record<RuntimePhase, string> = {
	thinking: "Thinking",
	acting: "Acting",
	observing: "Observing",
	deciding: "Deciding"
}

const phaseClassMap: Record<RuntimePhase, string> = {
	thinking: styles.phaseThinking,
	acting: styles.phaseActing,
	observing: styles.phaseObserving,
	deciding: styles.phaseDeciding
}

function formatJson(str: string): string {
	try {
		return JSON.stringify(JSON.parse(str), null, 2)
	} catch {
		return str
	}
}

function PhaseContent({ phase }: { phase: PhaseRecord }) {
	return (
		<div className={styles.phaseContent}>
			{phase.reasoning && (
				<div className={styles.phaseSection}>
					<div className={styles.phaseSectionLabel}>Reasoning</div>
					<pre className={styles.preBlock}>{phase.reasoning}</pre>
				</div>
			)}
			{phase.text && (
				<div className={styles.phaseSection}>
					<div className={styles.phaseSectionLabel}>Response</div>
					<pre className={styles.preBlock}>{phase.text}</pre>
				</div>
			)}
			{phase.toolCalls && phase.toolCalls.length > 0 && (
				<div className={styles.phaseSection}>
					<div className={styles.phaseSectionLabel}>Tool Calls</div>
					{phase.toolCalls.map((tc) => (
						<div key={tc.toolCallId} className={styles.toolCallItem}>
							<div className={styles.toolCallName}>{tc.toolName}</div>
							{tc.arguments && (
								<pre className={styles.preBlockSmall}>{formatJson(tc.arguments)}</pre>
							)}
							{tc.result !== undefined && (
								<div className={styles.toolCallResult}>
									<span className={`${styles.toolCallStatus} ${tc.success ? styles.toolCallSuccess : styles.toolCallError}`}>
										{tc.success ? "success" : "error"}
									</span>
									<pre className={styles.preBlockSmall}>{tc.result}</pre>
								</div>
							)}
						</div>
					))}
				</div>
			)}
			{phase.terminationReason && (
				<div className={styles.phaseSection}>
					<div className={styles.terminationReason}>Terminated: {phase.terminationReason}</div>
				</div>
			)}
		</div>
	)
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
						{iter.phases.map((phaseRec, idx) => (
							<div key={idx} className={`${styles.phaseItem} ${phaseClassMap[phaseRec.phase] ?? ""}`}>
								<div className={styles.phaseHeader}>
									<span className={styles.phaseDot} />
									<span className={styles.phaseLabel}>{phaseLabelMap[phaseRec.phase]}</span>
								</div>
								<PhaseContent phase={phaseRec} />
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
