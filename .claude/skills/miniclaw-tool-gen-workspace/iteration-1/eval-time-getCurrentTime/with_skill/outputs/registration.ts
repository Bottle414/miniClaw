import { timeGetCurrentTime } from "./time"

toolHandler.register(timeGetCurrentTime.definition, timeGetCurrentTime.executor)
