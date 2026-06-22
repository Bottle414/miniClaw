import { useCallback, useRef } from "react"

export function useSpeechRecognition(onResult: (text: string) => void, onEnd?: () => void, onError?: () => void) {
	// @ts-expect-error
	const recognitionRef = useRef<SpeechRecognition | null>(null)
	const onResultRef = useRef(onResult)
	const onEndRef = useRef(onEnd)
	const onErrorRef = useRef(onError)

	onResultRef.current = onResult
	onEndRef.current = onEnd
	onErrorRef.current = onError

	const start = useCallback(() => {
		// @ts-expect-error
		const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
		const recognition = new Recognition()
		recognition.lang = "zh-CN"
		recognition.continuous = false
		/** 开启实时结果 */
		recognition.interimResults = true

		recognition.onstart = () => {
			console.log("start")
		}

		recognition.onend = () => {
			console.log("end")
			onEndRef.current?.()
		}

		recognition.onerror = (event) => {
			console.log("error", event)
			onErrorRef.current?.()
			onEndRef.current?.()
		}

		recognition.onresult = (event) => {
			const last = event.results[event.results.length - 1]

			const text = last[0].transcript

			onResultRef.current(text)
		}
		recognitionRef.current = recognition
		recognition.start()
	}, [])

	const abort = useCallback(() => {
		console.log("abort")
		recognitionRef.current?.abort()
		recognitionRef.current = null
	}, [])

	return { start, stop, abort }
}
