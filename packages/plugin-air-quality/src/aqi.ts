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

/** Tinted badge colours — readable on light and dark dashboard panels. */
export function aqiBadgeStyle(aqi: number): {
  background: string;
  border: string;
  labelColor: string;
  valueColor: string;
} {
  if (aqi <= 50) {
    return {
      background: "rgba(0, 168, 56, 0.22)",
      border: "rgba(0, 168, 56, 0.55)",
      labelColor: "#0b5d2e",
      valueColor: "#064a24",
    };
  }
  if (aqi <= 100) {
    return {
      background: "rgba(255, 214, 0, 0.28)",
      border: "rgba(180, 140, 0, 0.55)",
      labelColor: "#6b4e00",
      valueColor: "#4a3600",
    };
  }
  if (aqi <= 150) {
    return {
      background: "rgba(255, 126, 0, 0.24)",
      border: "rgba(200, 90, 0, 0.55)",
      labelColor: "#8a3d00",
      valueColor: "#6b2f00",
    };
  }
  if (aqi <= 200) {
    return {
      background: "rgba(255, 0, 0, 0.18)",
      border: "rgba(200, 0, 0, 0.5)",
      labelColor: "#8b0000",
      valueColor: "#6b0000",
    };
  }
  if (aqi <= 300) {
    return {
      background: "rgba(143, 63, 151, 0.22)",
      border: "rgba(110, 48, 118, 0.55)",
      labelColor: "#5c2860",
      valueColor: "#421d45",
    };
  }
  return {
    background: "rgba(126, 0, 35, 0.22)",
    border: "rgba(100, 0, 28, 0.55)",
    labelColor: "#5c0018",
    valueColor: "#420012",
  };
}
