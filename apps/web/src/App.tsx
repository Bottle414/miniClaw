/**
 * miniClaw Web UI
 *
 * 三栏布局：Session Sidebar + Chat Area + Runtime Inspector
 */

import { ConfigProvider, theme } from "antd"

import { Layout } from "./components/Layout"

const antTheme = {
	token: {
		colorPrimary: "#d97757",
		colorBgContainer: "#ffffff",
		colorBgLayout: "#f7f7f8",
		colorBorder: "#e5e5e5",
		colorBorderSecondary: "#f0f0f0",
		colorText: "#1a1a1a",
		colorTextSecondary: "#6b6b6b",
		borderRadius: 8,
		fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
		fontSize: 14
	}
}

function App() {
	return (
		<ConfigProvider theme={{ ...antTheme, algorithm: theme.defaultAlgorithm }}>
			<Layout />
		</ConfigProvider>
	)
}

export default App
