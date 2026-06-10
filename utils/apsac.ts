/**
 * APSAC ArcGIS REST service
 *
 * Status (verified June 2026):
 *   • MapServer capabilities = "Map" only (tile rendering)
 *   • identify / query / FeatureServer query → all return 400/500 "not supported"
 *   • WMS GetFeatureInfo → 400 error
 *
 * The service is a read-only tile cache; feature queries are disabled server-side.
 * Survey numbers cannot be retrieved via this API.
 *
 * Field names (from layer metadata for reference):
 *   parcelnam  – survey / parcel number
 *   mandalnam  – mandal name
 *   dstrctnam  – district name
 *   villagenam – village name
 *   parceltyp  – parcel type
 *   parceldsc  – parcel description
 */
export const APSAC_STATUS = "locked";
