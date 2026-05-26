import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { GeoJSON as LeafletGeoJSON } from 'react-leaflet'
import { parse as parseWkt } from 'terraformer-wkt-parser'

interface MapProps {
    /** GeoJSON geometry to draw on the map */
    geojson?: string;
}

export function Map({ geojson }: MapProps) {
    const [geoJson, setGeoJson] = useState<any>(null);

    useEffect(() => {
        if (geojson) {
            try {
                const geoJsonData = JSON.parse(geojson);
                console.log('Parsed GeoJSON geometry:', geoJsonData);

                if (geoJsonData && geoJsonData.type) {
                    if (geoJsonData.type != "GeometryCollection") {
                        setGeoJson({ type: 'Feature', geometry: geoJsonData });
                    } else {
                        // setGeoJson({ type: 'FeatureCollection', features: geoJsonData.geometries.map((g) => ({ type: 'Feature', geometry: g })) });
                    }
                } else {
                    setGeoJson(geoJsonData);
                }
            } catch (err) {
                console.error('failed to parse GeoJSON:', err);
                setGeoJson(null);
            }
        } else {
            console.log('No GeoJSON input provided, clearing map.');
            setGeoJson(null);
        }
    }, [geojson]);

    return (
        <div style={{ height: '100vh' }}>
            <MapContainer style={{ height: '100%' }} center={[22.3964, 114.1095]} zoom={13} scrollWheelZoom={true}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoJson && <LeafletGeoJSON data={geoJson} />}
            </MapContainer>
            {/* <div>{geoJson}</div> */}
        </div>
    )
}