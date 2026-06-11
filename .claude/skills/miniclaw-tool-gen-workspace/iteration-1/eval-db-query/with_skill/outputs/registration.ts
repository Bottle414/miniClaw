import { dbQuery } from "./db"

toolHandler.register(dbQuery.definition, dbQuery.executor)
