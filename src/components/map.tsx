// src/components/map.tsx
import { MapContainer, TileLayer } from 'react-leaflet'
import { GeoJSON as LeafletGeoJSON } from 'react-leaflet'

interface MapProps {
    geojson?: string;
}

function parseGeoJson(input: string | undefined): any {
    if (!input) return null;
    try {
        const parsed = JSON.parse(input);
        if (!parsed?.type) return null;
        if (parsed.type === 'Feature' || parsed.type === 'FeatureCollection') return parsed;
        if (parsed.type === 'GeometryCollection') {
            return {
                type: 'FeatureCollection',
                features: parsed.geometries.map((g: any) => ({ type: 'Feature', geometry: g }))
            };
        }
        return { type: 'Feature', geometry: parsed };
    } catch {
        return null;
    }
}

export function Map({ geojson }: MapProps) {
    const geoJsonData = parseGeoJson(geojson);

    return (
        <div style={{ height: '100vh' }}>
            <MapContainer style={{ height: '100%' }} center={[22.3964, 114.1095]} zoom={13} scrollWheelZoom={true}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoJsonData && <LeafletGeoJSON key={geojson} data={geoJsonData} />}
            </MapContainer>
        </div>
    )
}