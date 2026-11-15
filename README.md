FireScope
Harmonized Global Active Fire Analysis
An interactive geospatial application for exploring satellite-detected active fires, comparing MODIS and VIIRS observations, and examining the spatial and temporal distribution of fire activity.
<p align="center">
  <a href="https://fire-scope-v1.vercel.app/"><strong>Open the live FireScope application →</strong></a>
</p>1. Project overview
FireScope brings country-level fire statistics and satellite-derived active-fire detections into a single interactive 3D globe. It is designed as an exploratory analysis and visualization tool: users can inspect geographic patterns, compare satellite products, review regional burning calendars, and measure distances between locations and nearby detections.

The application combines two data pathways:
- Country analysis layer: a bundled GeoJSON feature collection containing country geometries and precomputed fire indicators.
- Active-fire observation layer: date-specific detections retrieved server-side from the NASA Fire Information for Resource Management System (FIRMS) API.
The two layers serve different purposes. The country layer provides a broad statistical overview, while the FIRMS layer provides selectable observations for a requested date window. The application does not treat the bundled country statistics as if they were recalculated from the currently selected FIRMS query.
2. Scientific and analytical scope
FireScope focuses on the spatial and temporal exploration of satellite-observed active-fire signals. A satellite fire detection is an observation flagged by a sensor's active-fire algorithm; it is not, by itself, a complete measurement of burned area, fire perimeter, fire duration, or fire impact.

The application supports the following analytical dimensions:
- Spatial distribution: country-level fire totals and area-normalized fire density, displayed on a global 3D globe.
- Temporal distribution: monthly burning calendars and year-to-year comparisons for selected months.
- Sensor comparison: separate views for MODIS and VIIRS products, including individual satellite selections.
- Fire radiative power: FRP values associated with individual detections, expressed in megawatts (MW).
- Day/night context: the day/night acquisition indicator supplied with the FIRMS detection records.
- Proximity exploration: great-circle distance measurement and counts of detections near a user-defined line and buffer distance.
These functions are intended for exploratory analysis and communication. They should not be interpreted as a validated operational fire-warning system or as a substitute for ground observations and specialist fire products.
3. Satellite data sources
NASA FIRMS
The live detection workflow requests data from the NASA FIRMS area API. The implementation supports these product families:
Sensor family	Satellite / platform selection	FIRMS product identifiers used
MODIS	Terra and Aqua	MODIS_SP, MODIS_NRT
VIIRS	Suomi NPP	VIIRS_SNPP_SP, VIIRS_SNPP_NRT
VIIRS	NOAA-20	VIIRS_NOAA20_SP, VIIRS_NOAA20_NRT
VIIRS	NOAA-21	VIIRS_NOAA21_SP, VIIRS_NOAA21_NRT


For a requested sensor and date, FireScope checks FIRMS product availability. It selects the science-quality archive product when the requested date falls within its available coverage; otherwise, it uses the corresponding near-real-time (NRT) product when available. A date with no available product coverage returns no detections for that source.

The application exposes filters for the combined MODIS family, Terra, Aqua, the combined VIIRS family, Suomi NPP, NOAA-20, and NOAA-21. The combined Harmonized option requests MODIS and all three supported VIIRS platform streams.

Official data access: NASA FIRMS
4. Harmonization approach
MODIS and VIIRS have different sensor characteristics, spatial resolutions, and observation systems. FireScope therefore uses a transparent spatial-temporal de-duplication rule to create a combined display layer. This is a practical merge for exploratory visualization; it is not a radiometric calibration, a cross-sensor retrieval correction, or a scientifically validated equivalence model.

The current implementation follows these steps:
1. Normalize fields. FIRMS CSV rows are mapped to a shared record structure containing latitude, longitude, FRP, day/night flag, acquisition date, acquisition time, satellite, sensor, and source product.
2. Build a comparison cell. Each record is assigned a key using its acquisition date, a two-hour UTC time bin, and latitude/longitude rounded to two decimal places (approximately 0.01° grid spacing; the ground distance represented by a longitude interval varies with latitude).
3. Resolve likely duplicates. One record is retained for each key.
4. Apply a deterministic preference. If a MODIS and VIIRS record occupy the same cell, VIIRS is preferred. If records from the same sensor compete for a cell, the record with the higher FRP is retained.
5. Preserve source-level views. Users can switch back to individual sensor and satellite selections rather than using the merged layer.
The number of removed records is exposed in the live-fire status and report data. Because the rule uses rounded coordinates and time bins, it can merge nearby but distinct detections or fail to merge detections that represent the same event. Results should therefore be described as likely duplicate removal, not definitive event matching.
5. Country-level indicators
The repository includes public/data/firms_country_analysis.geojson, a GeoJSON FeatureCollection with 192 country or territory features in the current bundled file. Its properties include:
Indicator	Meaning in the interface
total_fire_pixels	Total fire-pixel count in the supplied country analysis dataset
fire_density_per_10k_km2	Fire-pixel density normalized per 10,000 km²
peak_burning_month	Month with the highest recorded burning activity in the supplied analysis
season_duration_months	Fire-season duration, in months, as supplied in the dataset
autocorr_12month	12-month autocorrelation indicator, where available
mean_frp_mw	Mean fire radiative power, in MW
max_frp_mw	Maximum fire radiative power, in MW
daytime_fire_pct	Percentage of detections classified as daytime observations
area_km2	Country or territory area, in km²


The GeoJSON file is consumed as a precomputed input. The repository does not currently include a reproducible country-statistics generation pipeline, source-period manifest, or full provenance record for every field in this file. Accordingly, the values should be cited as the bundled country analysis dataset until its upstream source, temporal coverage, processing definitions, and version are documented independently. Missing values are displayed as unavailable rather than inferred.
6. Temporal analysis and geographic aggregation
The burning calendar supports three geographic scopes:
- Country: detections are spatially filtered against the selected country's GeoJSON geometry.
- Continent: detections are requested within a regional bounding box and then filtered against the country geometries belonging to that continent.
- World: detections are counted globally without country-boundary clipping.
The timeline divides longer requests into windows of no more than five days, matching the request-window limit used by the FIRMS area API workflow. Completed windows are accumulated progressively and cached in the browser session to reduce repeated requests.

Important sampling distinction: country monthly calendars query the full selected year, and country historical comparisons query the full selected month for each year. For world and continent views, the current calendar samples the first day of each month; regional historical comparisons sample the first five days of the selected month in each year. These regional samples are not full-month or annual totals and must not be compared as though they were.
7. Interactive features
- Interactive 3D globe with country selection and hover details.
- Country-level fire indicators and density classification.
- Continent and minimum-density filters.
- Live FIRMS detection retrieval for a selected date and a window of one to five days.
- MODIS, Terra, Aqua, VIIRS, Suomi NPP, NOAA-20, NOAA-21, and harmonized source filters.
- Country, continent, and world burning calendars.
- Historical month comparisons across available years in the interface.
- Two-point line measurement with distance in kilometres.
- Count of displayed fire detections within a configurable buffer around the measured line.
- CSV export for currently supported report data and a print-oriented report view.
8. Data limitations and interpretation
FireScope is an exploratory visualization prototype. The following limitations are important when interpreting its output:
- Active-fire detections are sensor observations, not a direct count of individual fires. A single fire can produce multiple detections, and some fires may not be detected.
- Cloud cover, overpass timing, sensor resolution, detection thresholds, and product selection can affect the observed pattern.
- The MODIS–VIIRS harmonization is a deterministic de-duplication heuristic, not a sensor-calibration method or event-level fire reconstruction.
- The live globe limits the number of plotted points to 60,000 for a request. The returned source total and displayed point count can therefore differ; the plotted set is a sampled subset when the source response exceeds the display limit.
- Regional calendar sampling differs from country calendar sampling, as described above.
- The bundled country GeoJSON lacks an in-repository provenance manifest and documented temporal coverage. Its indicators should not be combined with live detections as if they shared a common processing period.
- A missing value means the indicator is unavailable in the input dataset; it does not mean zero fire activity.
- Distance and nearby-detection tools are geometric summaries, not estimates of fire spread, threat, or risk.
For research use, record the query date, selected product, date range, geographic scope, harmonization setting, and source-product identifiers alongside any exported result. Verify key findings against the original NASA product documentation and relevant ground or ancillary datasets before drawing operational conclusions.
9. Technical architecture
FireScope is a TypeScript web application built with:
- React for the user interface.
- TanStack Start / TanStack Router for application routing and server functions.
- Vite for development and production builds.
- globe.gl / Three.js for the interactive 3D globe.
- D3 Geo for geographic bounds and point-in-polygon operations.
- GeoJSON for country geometry and country-level attributes.
- Zod for validating server-function inputs.
- NASA FIRMS API for date-specific active-fire observations.
The browser calls TanStack server functions for FIRMS requests. The FIRMS map key is read on the server and should never be exposed as a VITE_ variable. Country geometry is loaded from the bundled GeoJSON by default. An optional FastAPI-compatible backend URL is also supported for country and statistics endpoints; if it is not configured or unavailable, the application falls back to the bundled country GeoJSON for the country layer.
10. Run locally
Requirements
- Node.js (an active LTS release is recommended)
- npm
- A NASA FIRMS MAP_KEY for live active-fire queries
Install and start
git clone https://github.com/deluluscientist/FireScope.v1.git
cd FireScope.v1
npm install
npm run dev
Open the local URL printed by Vite in the terminal.
Environment configuration
Configure the following variables in the deployment environment or a local server environment file as appropriate:
Variable	Runtime	Required	Purpose
FIRMS_MAP_KEY	Server only	Yes, for live FIRMS queries	Authenticates requests to NASA FIRMS. Never prefix this value with VITE_.
VITE_API_BASE_URL	Browser-visible	No	Optional base URL for the external FastAPI-compatible country/statistics API. Leave empty to use the bundled GeoJSON country layer.


The repository includes .env.example for the optional public API base URL. Add FIRMS_MAP_KEY as a server-side environment variable in your local/deployment configuration. Do not commit secrets to Git.
Build, test, and lint
npm run build
npm run preview
npm test
npm run lint
11. Deployment
The production application is deployed on Vercel:

Live application: https://fire-scope-v1.vercel.app/

For live FIRMS features, configure FIRMS_MAP_KEY in the Vercel project’s server-side Environment Variables, then redeploy. If the optional external country API is used, set VITE_API_BASE_URL and redeploy so the value is included in the client build.
12. Repository structure
FireScope.v1/
├── public/
│   └── data/
│       └── firms_country_analysis.geojson  # Bundled country analysis layer
├── src/
│   ├── components/                         # Globe, filters, panels, calendar, reports
│   ├── hooks/                              # Country, timeline, and fire-data hooks
│   ├── lib/                                # FIRMS access, harmonization, geometry, reports
│   ├── routes/                             # TanStack Start routes
│   ├── services/                           # Optional external API client
│   └── types/                              # Shared TypeScript data contracts
├── .env.example
├── package.json
└── README.md
13. Research and development status
The current implementation provides interactive exploration, satellite-source selection, heuristic MODIS–VIIRS de-duplication, regional temporal summaries, distance measurement, and report-oriented export functionality. Planned improvements include stronger provenance documentation for the bundled country dataset, reproducible preprocessing scripts for country indicators, validation of cross-sensor matching choices, and expanded export and historical-comparison options.
FireScope is an independent research and visualization project. NASA FIRMS data are accessed through the official service; FireScope is not a NASA product and does not imply NASA endorsement.
