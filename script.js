/* ══════════════════════════════════════════════════════
   script.js — Weather App
   Използва Open-Meteo API (безплатен, без API ключ).
   Структура:
     1. DOM референции
     2. Константи и помощни данни
     3. API функции (fetch)
     4. UI функции (показване/скриване)
     5. Бизнес логика (°C↔°F, история, геолокация)
     6. Event listeners (инициализация)
══════════════════════════════════════════════════════ */

/* ══════════════════════════════════
   1. DOM РЕФЕРЕНЦИИ
══════════════════════════════════ */
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

/* ══════════════════════════════════
   2. КОНСТАНТИ И ПОМОЩНИ ДАННИ
══════════════════════════════════ */
const GEO_URL     = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const AQI_URL     = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const CACHE_TTL   = 10 * 60 * 1000; /* 10 минути */

const cache = {};
let isCelsius = true;
let lastTempC = null;

/* ──────────────────────────────────────────
   WMO код → описание на времето
────────────────────────────────────────── */
const WEATHER_CONDITIONS = {
  0:  'Ясно',
  1:  'Предимно ясно',   2: 'Частично облачно', 3: 'Облачно',
  45: 'Мъгла',          48: 'Скрежовита мъгла',
  51: 'Лек ръмеж',      53: 'Умерен ръмеж',    55: 'Гъст ръмеж',
  61: 'Лек дъжд',       63: 'Умерен дъжд',     65: 'Силен дъжд',
  71: 'Лек сняг',       73: 'Умерен сняг',     75: 'Силен сняг',
  80: 'Леки превалявания', 81: 'Превалявания',  82: 'Силни превалявания',
  95: 'Гръмотевична буря',
  96: 'Гръмотевична буря с градушка',
  99: 'Гръмотевична буря с голяма градушка',
};

/* ──────────────────────────────────────────
   WMO код → Font Awesome клас
────────────────────────────────────────── */
const WEATHER_ICONS = {
  0:  'fa-solid fa-sun',
  1:  'fa-solid fa-sun',          2: 'fa-solid fa-cloud-sun',
  3:  'fa-solid fa-cloud',
  45: 'fa-solid fa-smog',        48: 'fa-solid fa-smog',
  51: 'fa-solid fa-cloud-drizzle', 53: 'fa-solid fa-cloud-drizzle',
  55: 'fa-solid fa-cloud-drizzle',
  61: 'fa-solid fa-cloud-rain',  63: 'fa-solid fa-cloud-rain',
  65: 'fa-solid fa-cloud-showers-heavy',
  71: 'fa-solid fa-snowflake',   73: 'fa-solid fa-snowflake',
  75: 'fa-solid fa-snowflake',
  80: 'fa-solid fa-cloud-rain',  81: 'fa-solid fa-cloud-rain',
  82: 'fa-solid fa-cloud-showers-heavy',
  95: 'fa-solid fa-bolt',        96: 'fa-solid fa-bolt',
  99: 'fa-solid fa-bolt',
};

/* ──────────────────────────────────────────
   WMO код → фонов градиент (пълен CSS низ)
   Прилага се върху body при всяко ново търсене.
────────────────────────────────────────── */
const WEATHER_GRADIENTS = {
  /* ☀️ Ясно — зелено → жълто → оранжево → червено */
  0:  'linear-gradient(135deg, #3a8c00 0%, #8cc800 28%, #d4b800 52%, #e06800 76%, #b83000 100%)',
  1:  'linear-gradient(135deg, #3a8c00 0%, #8cc800 28%, #d4b800 52%, #e06800 76%, #b83000 100%)',
  /* ⛅ Частично облачно — тъмно синьо → наситено лилаво */
  2:  'linear-gradient(135deg, #080a28 0%, #120840 50%, #280060 100%)',
  /* ☁️ Облачно — тъмно сиво-синьо */
  3:  'linear-gradient(135deg, #0e1520 0%, #1c2840 50%, #0e1520 100%)',
  /* 🌫️ Мъгла — сиво-синьо */
  45: 'linear-gradient(135deg, #181f2c 0%, #2c3848 50%, #181f2c 100%)',
  48: 'linear-gradient(135deg, #181f2c 0%, #2c3848 50%, #181f2c 100%)',
  /* 🌦️ Ръмеж — тъмен тюркоаз */
  51: 'linear-gradient(135deg, #061a22 0%, #0a3a48 50%, #0d5060 100%)',
  53: 'linear-gradient(135deg, #061a22 0%, #0a3a48 50%, #0d5060 100%)',
  55: 'linear-gradient(135deg, #04121a 0%, #072838 50%, #0a3f50 100%)',
  /* 🌧️ Дъжд — тъмно кобалтово синьо */
  61: 'linear-gradient(135deg, #040d25 0%, #0a1f55 50%, #0d2870 100%)',
  63: 'linear-gradient(135deg, #03091a 0%, #07153c 50%, #0a1c55 100%)',
  65: 'linear-gradient(135deg, #020610 0%, #050e28 50%, #080f3a 100%)',
  /* ❄️ Сняг — студено синьо → ярко циан */
  71: 'linear-gradient(135deg, #012040 0%, #0255a0 45%, #0099bb 100%)',
  73: 'linear-gradient(135deg, #011830 0%, #014588 50%, #007aa0 100%)',
  75: 'linear-gradient(135deg, #010f20 0%, #013570 50%, #005a85 100%)',
  /* 🌦️ Превалявания — тъмно синьо */
  80: 'linear-gradient(135deg, #040d25 0%, #0a1f55 50%, #0d2870 100%)',
  81: 'linear-gradient(135deg, #03091a 0%, #07153c 50%, #0a1c55 100%)',
  82: 'linear-gradient(135deg, #020610 0%, #050e28 50%, #080f3a 100%)',
  /* ⛈️ Гръмотевична буря — много тъмно лилаво */
  95: 'linear-gradient(135deg, #06000f 0%, #160035 50%, #2a0055 100%)',
  96: 'linear-gradient(135deg, #04000a 0%, #0f0025 50%, #1e003d 100%)',
  99: 'linear-gradient(135deg, #020007 0%, #0a0018 50%, #160028 100%)',
};

/* ══════════════════════════════════
   3. API ФУНКЦИИ
══════════════════════════════════ */

/**
 * Взема координатите на даден град.
 * @param {string} cityName
 * @returns {Promise<{label:string, name:string, latitude:number, longitude:number}>}
 * @throws {Error}
 */
async function getCoordinates(cityName) {
  const url = `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=5&format=json`;
  const res  = await fetch(url);

  if (!res.ok) throw new Error('Грешка при свързване с геокодиращия сървър.');

  const data = await res.json();

  if (!data.results?.length) {
    throw new Error(`Градът "${cityName}" не беше намерен. Опитай на латиница (напр. "Sofia").`);
  }

  const best  = data.results[0];
  const label = best.country_code ? `${best.name}, ${best.country_code}` : best.name;

  return { label, name: best.name, latitude: best.latitude, longitude: best.longitude };
}
// Превръща кирилица → латиница (за Open‑Meteo)
function toLatin(text) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
    р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sht", ъ: "a", ь: "", ю: "yu", я: "ya"
  };

  return text
    .toLowerCase()
    .split("")
    .map(ch => map[ch] || ch)
    .join("");
}

// Търсене на град
async function searchCity(cityName) {
  const query = toLatin(cityName.trim());

  if (!query) {
    showError("Моля, въведи град.");
    return;
  }

  try {
    loading.classList.add("visible");
    errorBox.classList.remove("visible");

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`
    );

    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError(`Градът "${cityName}" не беше намерен.`);
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    await loadWeather(latitude, longitude, name, country);

  } catch (err) {
    showError("Възникна грешка при търсенето.");
  } finally {
    loading.classList.remove("visible");
  }
}



/**
 * Изтегля прогнозата по координати. Използва кеш с TTL 10 мин.
 * @param {string} cacheKey
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>}
 */
async function fetchWeatherData(cacheKey, latitude, longitude) {
  /* Върни от кеш ако е прясно */
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached.data;
  }

  const url =
    `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current_weather=true` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=auto&wind_speed_unit=kmh`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Грешка при свързване с метеорологичния сървър.');

  const data = await res.json();
  cache[cacheKey] = { data, timestamp: Date.now() };
  console.log(`[Cache SET] ${cacheKey}`);

  return data;
}

/**
 * Изтегля European AQI. При грешка — връща null (не спира останалото).
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<number|null>}
 */
async function fetchAirQuality(latitude, longitude) {
  const url =
    `${AQI_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=european_aqi&timezone=auto&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data   = await res.json();
  const times  = data.hourly?.time;
  const values = data.hourly?.european_aqi;
  if (!times || !values) return null;

  const currentHour = new Date().toISOString().slice(0, 13);
  const idx         = times.findIndex(t => t.startsWith(currentHour));

  return idx !== -1 ? values[idx] : values.at(-1);
}

/* ══════════════════════════════════
   4. UI ФУНКЦИИ
══════════════════════════════════ */

const showLoading    = () => DOM.loading.classList.add('visible');
const hideLoading    = () => DOM.loading.classList.remove('visible');
const hideError      = () => DOM.error.classList.remove('visible');
const hideWeatherInfo = () => DOM.weatherInfo.classList.remove('visible');

/** Подготвя UI преди всяко търсене — скрива стари данни и показва спинер */
function resetUI() {
  showLoading();
  hideError();
  hideWeatherInfo();
}

/**
 * Показва съобщение за грешка.
 * @param {string} message
 */


/**
 * Прилага фонов градиент според WMO кода на времето.
 * @param {number} code — WMO weather code
 */
function applyWeatherGradient(code) {
  const gradient = WEATHER_GRADIENTS[code] ?? 'linear-gradient(135deg, #0d1b2a 0%, #1b0a2e 100%)';
  document.body.style.background = gradient;
}

/**
 * Попълва UI с данни за времето.
 * @param {string} cityLabel
 * @param {object} data — JSON от Open-Meteo
 */
function displayWeather(cityLabel, data) {
  const { current_weather: cw, daily } = data;

  lastTempC = cw.temperature;
  isCelsius = true;

  DOM.cityName.textContent         = cityLabel;
  DOM.temperature.textContent      = `${cw.temperature}°C`;
  DOM.toggleUnit.textContent       = '°C / °F';
  DOM.weatherCondition.textContent = getWeatherCondition(cw.weathercode);
  DOM.weatherIcon.className        = `weather-icon ${getWeatherIcon(cw.weathercode)}`;
  DOM.windSpeed.textContent        = `${cw.windspeed} km/h`;

  /* Смени фона според времето */
  applyWeatherGradient(cw.weathercode);

  renderForecast(daily);
  DOM.weatherInfo.classList.add('visible');
}

/**
 * Обновява AQI картата.
 * @param {number|null} aqi
 */
function displayAirQuality(aqi) {
  DOM.aqiCard.classList.remove('aqi-good', 'aqi-moderate', 'aqi-poor');

  if (aqi === null) {
    DOM.airQuality.textContent = 'N/A';
    DOM.aqiLabel.textContent   = '';
    return;
  }

  const { cssClass, label } = getAqiInfo(aqi);
  DOM.airQuality.textContent = aqi;
  DOM.aqiLabel.textContent   = label;
  DOM.aqiCard.classList.add(cssClass);
}

/**
 * Рендира картите за 5-дневната прогноза (пропуска днес).
 * @param {object} daily
 */
function renderForecast(daily) {
  DOM.forecast.innerHTML = '';

  daily.time.forEach((dateStr, i) => {
    if (i === 0 || i > 5) return;

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <span class="day-name">${new Date(dateStr).toLocaleDateString('bg-BG', { weekday: 'short' })}</span>
      <i class="${getWeatherIcon(daily.weathercode[i])}"></i>
      <span class="day-max">${daily.temperature_2m_max[i]}°</span>
      <span class="day-min">${daily.temperature_2m_min[i]}°</span>
    `;
    DOM.forecast.appendChild(card);
  });
}

/* ══════════════════════════════════
   5. ПОМОЩНИ ФУНКЦИИ / БИЗНЕС ЛОГИКА
══════════════════════════════════ */

/** @param {number} code @returns {string} */
const getWeatherCondition = code => WEATHER_CONDITIONS[code] ?? 'Неизвестно';

/** @param {number} code @returns {string} */
const getWeatherIcon = code => WEATHER_ICONS[code] ?? 'fa-solid fa-cloud';

/** @param {number} celsius @returns {number} */
const toFahrenheit = celsius => celsius * 9 / 5 + 32;

/** @param {number} aqi @returns {{cssClass:string, label:string}} */
function getAqiInfo(aqi) {
  if (aqi <= 50)  return { cssClass: 'aqi-good',     label: 'Добро' };
  if (aqi <= 100) return { cssClass: 'aqi-moderate', label: 'Умерено' };
  return              { cssClass: 'aqi-poor',     label: 'Лошо' };
}

/** Обновява температурата без нов API заявка */
function updateTemperatureDisplay() {
  if (lastTempC === null) return;

  if (isCelsius) {
    DOM.temperature.textContent = `${lastTempC}°C`;
    DOM.toggleUnit.textContent  = '°C / °F';
  } else {
    DOM.temperature.textContent = `${toFahrenheit(lastTempC).toFixed(1)}°F`;
    DOM.toggleUnit.textContent  = '°F / °C';
  }
}

/* ── ИСТОРИЯ (localStorage) ── */

/** @returns {string[]} */
const getHistory = () => JSON.parse(localStorage.getItem('weatherHistory') ?? '[]');

/** Добавя в началото, без дубликати, макс. 5 елемента */
function saveToHistory(cityName) {
  const history = [
    cityName,
    ...getHistory().filter(c => c.toLowerCase() !== cityName.toLowerCase()),
  ].slice(0, 5);

  localStorage.setItem('weatherHistory', JSON.stringify(history));
  renderHistory();
}

/** Рендира тагчетата за история */
function renderHistory() {
  DOM.historyContainer.innerHTML = '';

  getHistory().forEach(city => {
    const tag = document.createElement('button');
    tag.className   = 'history-tag';
    tag.textContent = city;
    tag.type        = 'button';
    tag.setAttribute('aria-label', `Търси за ${city}`);
    tag.addEventListener('click', () => {
      DOM.searchInput.value = city;
      searchWeatherByCity(city);
    });
    DOM.historyContainer.appendChild(tag);
  });
}

/* ── ТЪРСЕНЕ — обща логика след намиране на координати ── */

/**
 * Изтегля прогнозата и AQI едновременно и показва резултата.
 * Споделена между searchWeatherByCity и searchWeatherByCoords.
 */
async function runSearch(cacheKey, latitude, longitude, label) {
  const [data, aqi] = await Promise.all([
    fetchWeatherData(cacheKey, latitude, longitude),
    fetchAirQuality(latitude, longitude),
  ]);
  displayWeather(label, data);
  displayAirQuality(aqi);
}

/**
 * Търсене по въведен град.
 * @param {string} cityName
 */
async function searchWeatherByCity(cityName) {
  resetUI();
  try {
    const { label, name, latitude, longitude } = await getCoordinates(cityName);
    await runSearch(cityName.trim().toLowerCase(), latitude, longitude, label);
    saveToHistory(name);
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Търсене по GPS координати (геолокация).
 * Използва Nominatim за обратно геокодиране → название на град.
 * @param {number} latitude
 * @param {number} longitude
 */
async function searchWeatherByCoords(latitude, longitude) {
  resetUI();
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { 'Accept-Language': 'bg' } }
    );

    let label = 'Твоята локация';
    if (geoRes.ok) {
      const g = await geoRes.json();
      label = g.address?.city ?? g.address?.town ?? g.address?.village ?? g.address?.county ?? label;
    }

    const key = `geo_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
    await runSearch(key, latitude, longitude, label);

  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

/* ── ГЕОЛОКАЦИЯ ── */

/** Пита браузъра за GPS и зарежда времето за текущата локация */
function loadWeatherByGeolocation() {
  if (!navigator.geolocation) {
    showError('Браузърът ти не поддържа геолокация.');
    return;
  }

  showLoading();

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => searchWeatherByCoords(coords.latitude, coords.longitude),
    ({ code })   => {
      hideLoading();
      showError(code === 1
        ? 'Достъпът до локацията беше отказан.'
        : 'Не може да се определи локацията.');
    }
  );
}
function showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.add("visible");
  setTimeout(() => errorBox.classList.remove("visible"), 4000);
}

/* ══════════════════════════════════
   6. EVENT LISTENERS
══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  renderHistory();

  DOM.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const city = toLatin(searchInput.value.trim());
    if (!city) { showError('Моля, въведи название на град.'); return; }
    searchWeatherByCity(city);
  });

  DOM.geoBtn.addEventListener('click', loadWeatherByGeolocation);

  DOM.toggleUnit.addEventListener('click', () => {
    isCelsius = !isCelsius;
    updateTemperatureDisplay();
  });  
});