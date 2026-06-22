/* ══════════════════════════════════════════════════════
   script.js — Weather App (финална версия)
══════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────
   1. DOM РЕФЕРЕНЦИИ
────────────────────────────────────────────── */
const DOM = {
  searchForm:       document.getElementById('search-form'),
  searchInput:      document.getElementById('search-input'),
  geoBtn:           document.getElementById('geo-btn'),
  historyContainer: document.getElementById('history-container'),
  loading:          document.getElementById('loading'),
  error:            document.getElementById('error'),
  errorText:        document.getElementById('error-text'),
  weatherInfo:      document.getElementById('weather-info'),
  cityName:         document.getElementById('city-name'),
  weatherIcon:      document.getElementById('weather-icon'),
  temperature:      document.getElementById('temperature'),
  toggleUnit:       document.getElementById('toggle-unit'),
  weatherCondition: document.getElementById('weather-condition'),
  windSpeed:        document.getElementById('wind-speed'),
  aqiCard:          document.getElementById('aqi-card'),
  airQuality:       document.getElementById('air-quality'),
  aqiLabel:         document.getElementById('aqi-label'),
  forecast:         document.getElementById('forecast'),
};

/* ───────────────────────────────────────────────
   2. КОНСТАНТИ
────────────────────────────────────────────── */
const GEO_URL     = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const AQI_URL     = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const CACHE_TTL   = 10 * 60 * 1000;

const cache = {};
let isCelsius = true;
let lastTempC = null;

/* ───────────────────────────────────────────────
   3. ТРАНСЛИТЕРАЦИЯ (BG → LATIN)
────────────────────────────────────────────── */
function toLatin(text) {
  const map = {
    а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ж:"zh", з:"z",
    и:"i", й:"y", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p",
    р:"r", с:"s", т:"t", у:"u", ф:"f", х:"h", ц:"ts", ч:"ch",
    ш:"sh", щ:"sht", ъ:"a", ь:"", ю:"yu", я:"ya"
  };
  return text.toLowerCase().split("").map(ch => map[ch] || ch).join("");
}

/* ───────────────────────────────────────────────
   4. WEATHER CODE → ТЕКСТ + ИКОНА
────────────────────────────────────────────── */
const WEATHER_CONDITIONS = {
  0:'Ясно',1:'Предимно ясно',2:'Частично облачно',3:'Облачно',
  45:'Мъгла',48:'Мъгла',
  51:'Ръмеж',53:'Ръмеж',55:'Ръмеж',
  61:'Дъжд',63:'Дъжд',65:'Силен дъжд',
  71:'Сняг',73:'Сняг',75:'Сняг',
  80:'Превалявания',81:'Превалявания',82:'Превалявания',
  95:'Буря',96:'Буря',99:'Буря'
};

const WEATHER_ICONS = {
  0:'fa-solid fa-sun',
  1:'fa-solid fa-sun',
  2:'fa-solid fa-cloud-sun',
  3:'fa-solid fa-cloud',
  45:'fa-solid fa-smog',
  48:'fa-solid fa-smog',
  51:'fa-solid fa-cloud-rain',
  53:'fa-solid fa-cloud-rain',
  55:'fa-solid fa-cloud-rain',
  61:'fa-solid fa-cloud-showers-heavy',
  63:'fa-solid fa-cloud-showers-heavy',
  65:'fa-solid fa-cloud-showers-heavy',
  71:'fa-solid fa-snowflake',
  73:'fa-solid fa-snowflake',
  75:'fa-solid fa-snowflake',
  80:'fa-solid fa-cloud-rain',
  81:'fa-solid fa-cloud-rain',
  82:'fa-solid fa-cloud-showers-heavy',
  95:'fa-solid fa-bolt',
  96:'fa-solid fa-bolt',
  99:'fa-solid fa-bolt'
};

/* ───────────────────────────────────────────────
   5. ДИНАМИЧНИ ГРАДИЕНТИ (много по‑меки)
────────────────────────────────────────────── */
const WEATHER_GRADIENTS = {
  0:'linear-gradient(135deg, #0d1117 0%, #111720 100%)',
  1:'linear-gradient(135deg, #0d1117 0%, #111720 100%)',

  2:'linear-gradient(135deg, #0b0f1a 0%, #141a2b 50%, #1c1f33 100%)',
  3:'linear-gradient(135deg, #0c1118 0%, #151c26 50%, #0c1118 100%)',

  45:'linear-gradient(135deg, #11151c 0%, #1a1f28 50%, #11151c 100%)',
  48:'linear-gradient(135deg, #11151c 0%, #1a1f28 50%, #11151c 100%)',

  51:'linear-gradient(135deg, #0a141a 0%, #0f1f28 50%, #132833 100%)',
  53:'linear-gradient(135deg, #0a141a 0%, #0f1f28 50%, #132833 100%)',
  55:'linear-gradient(135deg, #081016 0%, #0c1a24 50%, #11242e 100%)',

  61:'linear-gradient(135deg, #080d18 0%, #0d1a33 50%, #112044 100%)',
  63:'linear-gradient(135deg, #070a14 0%, #0b152b 50%, #0f1c3d 100%)',
  65:'linear-gradient(135deg, #050810 0%, #0a1122 50%, #0d162f 100%)',

  71:'linear-gradient(135deg, #0a1a28 0%, #123a55 50%, #1a4f6d 100%)',
  73:'linear-gradient(135deg, #081520 0%, #10324a 50%, #184a63 100%)',
  75:'linear-gradient(135deg, #06101a 0%, #0d283f 50%, #153d55 100%)',

  80:'linear-gradient(135deg, #080d18 0%, #0d1a33 50%, #112044 100%)',
  81:'linear-gradient(135deg, #070a14 0%, #0b152b 50%, #0f1c3d 100%)',
  82:'linear-gradient(135deg, #050810 0%, #0a1122 50%, #0d162f 100%)',

  95:'linear-gradient(135deg, #0a0014 0%, #15002a 50%, #1f003d 100%)',
  96:'linear-gradient(135deg, #080012 0%, #120024 50%, #1c0035 100%)',
  99:'linear-gradient(135deg, #06000f 0%, #100020 50%, #1a0030 100%)',
};

function applyWeatherGradient(code) {
  document.body.style.background =
    WEATHER_GRADIENTS[code] ??
    'linear-gradient(135deg, #0d1117 0%, #111720 100%)';
}

/* ───────────────────────────────────────────────
   6. UI ФУНКЦИИ
────────────────────────────────────────────── */
function showLoading()  { DOM.loading.classList.add('visible'); }
function hideLoading()  { DOM.loading.classList.remove('visible'); }
function hideError()    { DOM.error.classList.remove('visible'); }
function hideWeather()  { DOM.weatherInfo.classList.remove('visible'); }

function showError(msg) {
  DOM.errorText.textContent = msg;
  DOM.error.classList.add('visible');
  setTimeout(() => DOM.error.classList.remove('visible'), 4000);
}

function resetUI() {
  showLoading();
  hideError();
  hideWeather();
}

/* ───────────────────────────────────────────────
   7. API — ГЕОКОДИРАНЕ
────────────────────────────────────────────── */
async function getCoordinates(cityName) {
  const url = `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Грешка при свързване със сървъра.");

  const data = await res.json();
  if (!data.results?.length)
    throw new Error(`Градът "${cityName}" не беше намерен.`);

  const c = data.results[0];
  return {
    label: `${c.name}, ${c.country_code}`,
    name: c.name,
    latitude: c.latitude,
    longitude: c.longitude
  };
}

/* ───────────────────────────────────────────────
   8. API — ВРЕМЕ + КЕШ
────────────────────────────────────────────── */
async function fetchWeatherData(cacheKey, lat, lon) {
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL)
    return cached.data;

  const url =
    `${WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=auto&wind_speed_unit=kmh`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Грешка при зареждане на времето.");

  const data = await res.json();
  cache[cacheKey] = { data, timestamp: Date.now() };
  return data;
}

/* ───────────────────────────────────────────────
   9. API — AQI
────────────────────────────────────────────── */
async function fetchAirQuality(lat, lon) {
  const url =
    `${AQI_URL}?latitude=${lat}&longitude=${lon}` +
    `&hourly=european_aqi&timezone=auto&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const times = data.hourly?.time;
  const values = data.hourly?.european_aqi;
  if (!times || !values) return null;

  const hour = new Date().toISOString().slice(0, 13);
  const idx = times.findIndex(t => t.startsWith(hour));
  return idx !== -1 ? values[idx] : values.at(-1);
}

/* ───────────────────────────────────────────────
   10. РЕНДЕРИРАНЕ НА UI
────────────────────────────────────────────── */
function displayWeather(label, data) {
  const cw = data.current_weather;

  lastTempC = cw.temperature;
  isCelsius = true;

  DOM.cityName.textContent = label;
  DOM.temperature.textContent = `${cw.temperature}°C`;
  DOM.weatherCondition.textContent = WEATHER_CONDITIONS[cw.weathercode] ?? "Неизвестно";
  DOM.weatherIcon.className = `weather-icon ${WEATHER_ICONS[cw.weathercode]}`;
  DOM.windSpeed.textContent = `${cw.windspeed} km/h`;

  applyWeatherGradient(cw.weathercode);

  renderForecast(data.daily);

  DOM.weatherInfo.classList.add('visible');
}

function displayAirQuality(aqi) {
  DOM.aqiCard.classList.remove('aqi-good','aqi-moderate','aqi-poor');

  if (aqi === null) {
    DOM.airQuality.textContent = "N/A";
    DOM.aqiLabel.textContent = "";
    return;
  }

  DOM.airQuality.textContent = aqi;

  if (aqi <= 50) {
    DOM.aqiCard.classList.add('aqi-good');
    DOM.aqiLabel.textContent = "Добро";
  } else if (aqi <= 100) {
    DOM.aqiCard.classList.add('aqi-moderate');
    DOM.aqiLabel.textContent = "Умерено";
  } else {
    DOM.aqiCard.classList.add('aqi-poor');
    DOM.aqiLabel.textContent = "Лошо";
  }
}

function renderForecast(daily) {
  DOM.forecast.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <span class="day-name">${new Date(daily.time[i]).toLocaleDateString('bg-BG',{weekday:'short'})}</span>
      <i class="${WEATHER_ICONS[daily.weathercode[i]]}"></i>
      <span class="day-max">${daily.temperature_2m_max[i]}°</span>
      <span class="day-min">${daily.temperature_2m_min[i]}°</span>
    `;
    DOM.forecast.appendChild(card);
  }
}

/* ───────────────────────────────────────────────
   11. ТЪРСЕНЕ
────────────────────────────────────────────── */
async function runSearch(cacheKey, lat, lon, label) {
  const [weather, aqi] = await Promise.all([
    fetchWeatherData(cacheKey, lat, lon),
    fetchAirQuality(lat, lon)
  ]);

  displayWeather(label, weather);
  displayAirQuality(aqi);
}

async function searchWeatherByCity(cityRaw) {
  resetUI();

  const original = cityRaw.trim();
  if (!original) return showError("Моля, въведи град.");

  const query = toLatin(original);

  try {
    const { label, latitude, longitude } = await getCoordinates(query);
    await runSearch(query, latitude, longitude, label);
    saveToHistory(original);
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

/* ───────────────────────────────────────────────
   12. ИСТОРИЯ
────────────────────────────────────────────── */
function getHistory() {
  return JSON.parse(localStorage.getItem("weatherHistory") ?? "[]");
}

function saveToHistory(city) {
  const history = [
    city,
    ...getHistory().filter(c => c.toLowerCase() !== city.toLowerCase())
  ].slice(0, 5);

  localStorage.setItem("weatherHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  DOM.historyContainer.innerHTML = "";
  getHistory().forEach(city => {
    const btn = document.createElement("button");
    btn.className = "history-tag";
    btn.textContent = city;
    btn.onclick = () => searchWeatherByCity(city);
    DOM.historyContainer.appendChild(btn);
  });
}

/* ───────────────────────────────────────────────
   13. ГЕОЛОКАЦИЯ
────────────────────────────────────────────── */
function loadWeatherByGeolocation() {
  if (!navigator.geolocation)
    return showError("Браузърът не поддържа геолокация.");

  showLoading();

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude, longitude } = pos.coords;
      await runSearch(`geo_${latitude}_${longitude}`, latitude, longitude, "Твоята локация");
      hideLoading();
    },
    () => {
      hideLoading();
      showError("Неуспешен достъп до локацията.");
    }
  );
}

/* ───────────────────────────────────────────────
   14. °C / °F
────────────────────────────────────────────── */
function updateTemperatureDisplay() {
  if (lastTempC === null) return;

  if (isCelsius) {
    DOM.temperature.textContent = `${lastTempC}°C`;
  } else {
    DOM.temperature.textContent = `${(lastTempC * 9/5 + 32).toFixed(1)}°F`;
  }
}

/* ───────────────────────────────────────────────
   15. EVENT LISTENERS
────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();

  DOM.searchForm.addEventListener("submit", e => {
    e.preventDefault();
    searchWeatherByCity(DOM.searchInput.value);
  });

  DOM.geoBtn.addEventListener("click", loadWeatherByGeolocation);

  DOM.toggleUnit.addEventListener("click", () => {
    isCelsius = !isCelsius;
    updateTemperatureDisplay();
  });
});
