/**
 * Server 路由常量
 *
 * 所有路由路径集中定义，松耦合便于修改
 */
export const API_BASE = "/api"
export const HEALTH = API_BASE + "/health"
export const SESSIONS = API_BASE + "/sessions"
export const SESSION_DETAIL = API_BASE + "/session/:id"
export const SESSION_METRICS = API_BASE + "/session/:id/metrics"
export const CHAT = API_BASE + "/chat"
export const USER_CONFIG = API_BASE + "/user-config"
export const TOOLS = API_BASE + "/tools"
export const PERMISSION = API_BASE + "/permission"
