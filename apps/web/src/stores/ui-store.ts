/**
 * UI 状态 Store
 *
 * 管理 Sidebar 和 Inspector 的展开/折叠状态
 */

import { create } from "zustand"

interface UIState {
  /** Sidebar 是否展开 */
  sidebarOpen: boolean
  /** Inspector 是否展开 */
  inspectorOpen: boolean
  /** 切换 Sidebar 展开/折叠 */
  toggleSidebar: () => void
  /** 切换 Inspector 展开/折叠 */
  toggleInspector: () => void
  /** 设置 Sidebar 状态 */
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open })
}))
