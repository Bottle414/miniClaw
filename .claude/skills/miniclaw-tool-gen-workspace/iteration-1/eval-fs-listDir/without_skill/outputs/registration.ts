import { fsListDir } from "./fs-listDir"
import { toolHandler } from "../../apps/runtime/src/tools/index"

// 注册 fs.listDir 工具
toolHandler.register(fsListDir.definition, fsListDir.executor)

console.log("fs.listDir tool registered successfully")
