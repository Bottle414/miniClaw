---
name: miniclaw-tool-gen
description: Generate miniClaw format tools following the project's tool system conventions. Use this skill whenever the user wants to create a new tool for miniClaw, add tool functionality, or generate tool definitions — even if they don't explicitly say "tool" but describe adding a capability, function, or action that the agent can perform. Also use when the user mentions tool registration, LLMTool, ToolExecutor, or tool naming in the miniClaw project.
---

# miniClaw Tool Generator

Generate new tools that fit the miniClaw tool system architecture.

## Context: How miniClaw Tools Work

miniClaw uses a register-and-dispatch pattern:

1. Each tool is an object with `definition` (satisfies `LLMTool`) and `executor`
2. Tools are registered in `apps/runtime/src/tools/index.ts` via `toolHandler.register()`
3. The `ToolHandler` makes tools available to LLMs via `getToolDefinitions()`
4. The adapter layer (`transformTools`) converts internal format to provider-specific format automatically

**You do NOT need to modify the adapter or any other layer** — only the tool file and the registration line.

## Tool File Template

Create a new file in `apps/runtime/src/tools/` following this exact pattern:

```ts
import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const <module><Function> = {
	definition: {
		name: "<module>.<function>",
		description: "<中文描述：这个工具做什么>",
		parameters: {
			type: "object",
			properties: {
				<paramName>: {
					type: "<string|number|boolean|object|array>",
					description: "<参数描述>"
				}
			},
			required: ["<必填参数>"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { <paramName> } = params as { <paramName>: <type> }
		// 实现逻辑
		return "<result>"
	}
}
```

## Naming Convention

**`module.function`** format — module lowercase, function camelCase:

| Good | Bad | Reason |
|------|-----|--------|
| `fs.readFile` | `Fs.ReadFile` | Module must be lowercase |
| `net.httpRequest` | `net.http_request` | Function must be camelCase |
| `weather.getWeather` | `getWeather` | Must include module prefix |
| `db.query` | `db.queryDB` | Avoid redundant suffixes |

The variable name uses PascalCase concatenation: `module` + `Function` → e.g., `weatherGetWeather`, `fsReadFile`, `netHttpRequest`.

## Registration

After creating the tool file, add the import and registration in `apps/runtime/src/tools/index.ts`:

1. Add import at the top with other tool imports:
   ```ts
   import { <module><Function> } from "./<filename>"
   ```

2. Add registration in the `// ============== 注册工具 ==============` section:
   ```ts
   toolHandler.register(<module><Function>.definition, <module><Function>.executor)
   ```

## Parameters Guide

Parameters follow JSON Schema format within `LLMFunctionParameters`:

- `type`: always `"object"` at the top level
- `properties`: each parameter has `type` and `description`
- `required`: array of parameter names that must be provided
- For optional parameters, omit from `required` and provide defaults in the executor

**Optional parameter pattern:**
```ts
parameters: {
	type: "object",
	properties: {
		path: { type: "string", description: "文件路径" },
		encoding: { type: "string", description: "文件编码，默认 utf-8" }
	},
	required: ["path"]
},
// In executor:
executor: (params: Record<string, unknown>): string => {
	const { path, encoding = "utf-8" } = params as { path: string; encoding?: string }
	// ...
}
```

## Executor Guidelines

The executor receives `params: Record<string, unknown>` and must return a `string`:

- Cast params to a typed object at the start: `const { ... } = params as { ... }`
- Handle edge cases: validate inputs, return meaningful error messages as strings
- Return results as human-readable strings (the LLM will interpret them)
- For errors, return descriptive error strings rather than throwing (the LLM needs to understand what went wrong)

## Workflow

When asked to create a tool:

1. **Understand the requirement** — what module does this belong to? What does it do? What parameters does it need?
2. **Choose the module name** — use an existing module if it fits (check `tools/` directory for existing files), or create a new one
3. **Write the tool file** — create in `apps/runtime/src/tools/`, following the template and naming conventions
4. **Register the tool** — add import and registration line in `apps/runtime/src/tools/index.ts`
5. **Verify** — ensure the file compiles by checking imports and types match exactly

## Examples

### Example 1: Simple tool with one required parameter

```ts
import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const weatherGetWeather = {
	definition: {
		name: "weather.getWeather",
		description: "获取指定城市的天气信息",
		parameters: {
			type: "object",
			properties: {
				city: {
					type: "string",
					description: "城市名称"
				}
			},
			required: ["city"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { city } = params as { city: string }
		if (city === "上海") {
			return "sunny"
		}
		return "rainy"
	}
}
```

### Example 2: Tool with multiple parameters (required + optional)

```ts
import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const fsReadFile = {
	definition: {
		name: "fs.readFile",
		description: "读取指定路径的文件内容",
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "文件路径"
				},
				encoding: {
					type: "string",
					description: "文件编码，默认 utf-8"
				}
			},
			required: ["path"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { path, encoding = "utf-8" } = params as { path: string; encoding?: string }
		try {
			return "file content"
		} catch (e) {
			return `读取文件失败: ${(e as Error).message}`
		}
	}
}
```

### Example 3: Tool returning structured data

```ts
import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const netHttpRequest = {
	definition: {
		name: "net.httpRequest",
		description: "发送 HTTP 请求并返回响应",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "请求 URL"
				},
				method: {
					type: "string",
					description: "HTTP 方法，默认 GET"
				}
			},
			required: ["url"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { url, method = "GET" } = params as { url: string; method?: string }
		// 返回 JSON 字符串形式的结构化数据
		return JSON.stringify({ status: 200, body: "response" })
	}
}
```
