export function getWeather(params: { city: string }) {
	console.log(params, params.city, typeof params)

	if (params.city === "上海") {
		return "sunny"
	}
	return "rainy"
}
