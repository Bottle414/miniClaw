import type { MemoryEntry, RuntimeMemoryState } from "./types"

export function createRuntimeMemoryState(): RuntimeMemoryState {
	return {
		session: { entries: [] },
		working: { entries: [] }
	}
}

export interface MemoryEntryInput {
	id: string
	content: string
	metadata?: Record<string, unknown>
	active?: boolean
	now?: number
}

function createEntry(
	input: MemoryEntryInput,
	scope: MemoryEntry["scope"],
	existing?: MemoryEntry
): MemoryEntry {
	const now = input.now ?? Date.now()

	return {
		id: input.id,
		content: input.content,
		scope,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		active: input.active ?? existing?.active ?? true,
		metadata: input.metadata ?? existing?.metadata
	}
}

function upsertEntry(
	entries: MemoryEntry[],
	input: MemoryEntryInput,
	scope: MemoryEntry["scope"]
): MemoryEntry[] {
	const index = entries.findIndex((entry) => entry.id === input.id)
	if (index === -1) return [...entries, createEntry(input, scope)]

	const nextEntries = [...entries]
	nextEntries[index] = createEntry(input, scope, entries[index])
	return nextEntries
}

export function setSessionMemory(
	memory: RuntimeMemoryState,
	input: MemoryEntryInput
): RuntimeMemoryState {
	return {
		...memory,
		session: {
			entries: upsertEntry(memory.session.entries, input, "session")
		}
	}
}

export function listSessionMemory(memory: RuntimeMemoryState): MemoryEntry[] {
	return [...memory.session.entries]
}

export function clearSessionMemory(
	memory: RuntimeMemoryState,
	id?: string
): RuntimeMemoryState {
	return {
		...memory,
		session: {
			entries: id
				? memory.session.entries.filter((entry) => entry.id !== id)
				: []
		}
	}
}

export function setWorkingMemory(
	memory: RuntimeMemoryState,
	input: MemoryEntryInput
): RuntimeMemoryState {
	return {
		...memory,
		working: {
			entries: upsertEntry(memory.working.entries, input, "working")
		}
	}
}

export function listWorkingMemory(memory: RuntimeMemoryState): MemoryEntry[] {
	return [...memory.working.entries]
}

export function clearWorkingMemory(
	memory: RuntimeMemoryState,
	id?: string
): RuntimeMemoryState {
	return {
		...memory,
		working: {
			entries: id
				? memory.working.entries.filter((entry) => entry.id !== id)
				: []
		}
	}
}
