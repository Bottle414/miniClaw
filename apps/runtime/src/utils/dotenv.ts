import { prodPath, devPath } from "../const"

export function getDotenvConfig() {
	return {
		path: process.env.NODE_ENV === "production" ? prodPath : devPath
	}
}
