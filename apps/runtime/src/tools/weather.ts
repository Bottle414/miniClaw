export function getWeather(params: { city: string }) {
	if (params.city === "上海") {
		return "sunny"
	}
	return "rainy"
}
