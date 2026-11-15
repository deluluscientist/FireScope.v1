export const FIRE_SOURCES = [
  { id: "HARMONIZED", label: "Harmonized · MODIS + VIIRS", shortLabel: "Harmonized" },
  { id: "MODIS", label: "MODIS · Terra + Aqua", shortLabel: "MODIS" },
  { id: "TERRA", label: "Terra · MODIS", shortLabel: "Terra" },
  { id: "AQUA", label: "Aqua · MODIS", shortLabel: "Aqua" },
  { id: "VIIRS", label: "VIIRS · all satellites", shortLabel: "VIIRS" },
  { id: "VIIRS_SNPP", label: "Suomi NPP · VIIRS", shortLabel: "Suomi NPP" },
  { id: "VIIRS_NOAA20", label: "NOAA-20 · VIIRS", shortLabel: "NOAA-20" },
  { id: "VIIRS_NOAA21", label: "NOAA-21 · VIIRS", shortLabel: "NOAA-21" },
] as const;

export type FireSource = (typeof FIRE_SOURCES)[number]["id"];

export function fireSourceLabel(source: FireSource): string {
  return FIRE_SOURCES.find((s) => s.id === source)?.shortLabel ?? source;
}
