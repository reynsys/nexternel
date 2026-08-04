/** US EPA AQI breakpoints for PM2.5 (µg/m³). */
const PM25_BREAKS = [
  { cLo: 0.0, cHi: 12.0, iLo: 0, iHi: 50 },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
  { cLo: 250.5, cHi: 350.4, iLo: 301, iHi: 400 },
  { cLo: 350.5, cHi: 500.4, iLo: 401, iHi: 500 },
];

export function aqiFromPm25(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 < 0) return 0;
  if (pm25 > 500.4) return 500;
  for (const b of PM25_BREAKS) {
    if (pm25 >= b.cLo && pm25 <= b.cHi) {
      return Math.round(((b.iHi - b.iLo) / (b.cHi - b.cLo)) * (pm25 - b.cLo) + b.iLo);
    }
  }
  return 0;
}

export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

export function aqiColor(aqi: number): string {
  if (aqi <= 50) return "#00e400";
  if (aqi <= 100) return "#ffff00";
  if (aqi <= 150) return "#ff7e00";
  if (aqi <= 200) return "#ff0000";
  if (aqi <= 300) return "#8f3f97";
  return "#7e0023";
}

/** Band pill colours for the AQI label (Good / Moderate / …). */
export function aqiBandPillStyle(aqi: number): {
  background: string;
  border: string;
  text: string;
} {
  if (aqi <= 50) {
    return {
      background: "#00ff55",
      border: "rgba(0, 204, 68, 0.55)",
      text: "#052e16",
    };
  }
  if (aqi <= 100) {
    return {
      background: "#ffd600",
      border: "rgba(180, 140, 0, 0.55)",
      text: "#3d2f00",
    };
  }
  if (aqi <= 150) {
    return {
      background: "#ff9100",
      border: "rgba(200, 90, 0, 0.55)",
      text: "#3d1a00",
    };
  }
  if (aqi <= 200) {
    return {
      background: "#ff1744",
      border: "rgba(200, 0, 0, 0.5)",
      text: "#fff",
    };
  }
  if (aqi <= 300) {
    return {
      background: "#8f3f97",
      border: "rgba(110, 48, 118, 0.55)",
      text: "#fff",
    };
  }
  return {
    background: "#7e0023",
    border: "rgba(100, 0, 28, 0.55)",
    text: "#fff",
  };
}
