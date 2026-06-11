import { dbQuery } from "./dbQuery"

toolHandler.register(dbQuery.definition, dbQuery.executor)
