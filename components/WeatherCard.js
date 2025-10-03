export default function WeatherCard() {
  return (
    <aside className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="font-bold text-[--text-fira-20-700]">WEATHER</h4>
      <div className="mt-3 flex items-center gap-3">
        <div className="text-5xl">🌤️</div>
        <div>
          <div className="text-2xl font-bold">64°</div>
          <div className="text-sm text-gray-600">Sunny</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">Forecast – 07/31/2025</div>
    </aside>
  );
}
