// js/api.js
export async function getCoordinates(city) {
  // ... твоят код
}

export async function fetchWeatherData(key, lat, lon) {
  // ... твоят код
}

// js/app.js — само import-и отгоре
import { getCoordinates, fetchWeatherData } from './api.js';
import { displayWeather, showError, showLoading } from './ui.js';
import { WEATHER_CONDITIONS, WEATHER_ICONS } from './weather-codes.js';

// ... после твоите event listeners
document.addEventListener('DOMContentLoaded', () => {
  // ...
});