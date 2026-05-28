import React, { useState } from 'react';
import proj4 from 'proj4';
import { wktToGeoJSON, geojsonToWKT } from "@terraformer/wkt"
import { arcgisToGeoJSON, geojsonToArcGIS } from "@terraformer/arcgis";

// Register proj4 definitions for supported SRS
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:2326", "+proj=tmerc +lat_0=22.31213333333333 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +datum=hk80 +units=m +no_defs");

interface SidePanelProps {
    /** called when the user clicks the apply button with the current geometry data */
    onApply?: (geojson: string) => void;
}

type InputFormat = 'wkt' | 'geojson' | 'arcgis';

export const SidePanel: React.FC<SidePanelProps> = ({ onApply }) => {
    const [selectedSRS, setSelectedSRS] = useState('EPSG:4326');
    const [inputSRS, setInputSRS] = useState('EPSG:4326');
    const [inputFormat, setInputFormat] = useState<InputFormat>('wkt');
    const [geojsonInput, setGeoJSONInput] = useState('');
    const [convertedOutput, setConvertedOutput] = useState('');

    const spatialReferences = [
        { label: 'WGS 84 (EPSG:4326)', value: 'EPSG:4326' },
        { label: 'HK80 (EPSG:2326)', value: 'EPSG:2326' },
        // { label: 'Web Mercator (EPSG:3857)', value: 'EPSG:3857' },
        // { label: 'UTM Zone 33N (EPSG:32633)', value: 'EPSG:32633' },
    ];

    const inputFormats = [
        { label: 'WKT', value: 'wkt' },
        { label: 'GeoJSON', value: 'geojson' },
        { label: 'ArcGIS JSON', value: 'arcgis' },
    ];

    /**
     * Recursively transform coordinates in a GeoJSON geometry
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformCoordinates = (geometry: any, fromSRS: string, toSRS: string): any => {
        if (!geometry || !geometry.coordinates) return geometry;
        
        if (fromSRS === toSRS) return geometry;
        
        const transformCoord = (coords: number[]) => {
            if (fromSRS && toSRS) {
                try {
                    const [x, y] = coords;
                    const result = proj4(fromSRS, toSRS, [x, y]);
                    return [result[0] as number, result[1] as number];
                } catch (e) {
                    console.error('proj4 transformation error:', e);
                    return coords;
                }
            }
            return coords;
        };
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformCoordsRecursive = (coords: any): any => {
            if (Array.isArray(coords)) {
                // Check if this is a coordinate pair (length 2 or more for 3D)
                if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                    return transformCoord(coords);
                }
                // Otherwise, recursively transform nested arrays
                return coords.map(transformCoordsRecursive);
            }
            return coords;
        };
        
        return {
            ...geometry,
            coordinates: transformCoordsRecursive(geometry.coordinates)
        };
    };

    /**
     * Transform an entire GeoJSON object (Feature or FeatureCollection)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformGeoJSON = (geojson: any, fromSRS: string, toSRS: string): any => {
        if (!geojson) return geojson;
        
        if (geojson.type === 'Feature') {
            return {
                ...geojson,
                geometry: transformCoordinates(geojson.geometry, fromSRS, toSRS)
            };
        }
        
        if (geojson.type === 'FeatureCollection') {
            return {
                ...geojson,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                features: geojson.features.map((f: any) => transformGeoJSON(f, fromSRS, toSRS))
            };
        }
        
        if (geojson.type && geojson.coordinates) {
            return transformCoordinates(geojson, fromSRS, toSRS);
        }
        
        return geojson;
    };

    const convertToGeoJSON = (input: string, format: InputFormat, fromSRS?: string, toSRS?: string): string => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let geojson: any;
            
            if (format === 'wkt') {
                geojson = wktToGeoJSON(input);
            } else if (format === 'geojson') {
                geojson = JSON.parse(input);
            } else if (format === 'arcgis') {
                const arcgisJson = JSON.parse(input);
                geojson = arcgisToGeoJSON(arcgisJson);
            } else {
                return input;
            }
            
            // Apply SRS transformation if needed
            if (fromSRS && toSRS && fromSRS !== toSRS) {
                geojson = transformGeoJSON(geojson, fromSRS, toSRS);
            }
            
            return JSON.stringify(geojson);
        } catch (error) {
            console.error('Conversion error:', error);
            throw new Error(`Failed to convert from ${format} to WKT: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const convertFormat = (input: string, fromFormat: InputFormat, toFormat: InputFormat, fromSRS?: string, toSRS?: string): string => {
        try {
            if (fromFormat === toFormat && !fromSRS && !toSRS) {
                return input;
            }
            
            // First convert to GeoJSON as intermediate format
            const geoJSONString = convertToGeoJSON(input, fromFormat, fromSRS, toSRS);
            const geojsonObj = JSON.parse(geoJSONString);
            
            // Then convert from GeoJSON to target format
            if (toFormat === 'wkt') {
                return geojsonToWKT(geojsonObj);
            } else if (toFormat === 'geojson') {
                return geoJSONString;
            } else if (toFormat === 'arcgis') {
                return JSON.stringify(geojsonToArcGIS(geojsonObj));
            }
            
            return input;
        } catch (error) {
            console.error('Format conversion error:', error);
            throw new Error(`Failed to convert from ${fromFormat} to ${toFormat}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleConvert = (targetFormat: InputFormat) => {
        if (!geojsonInput.trim()) return;
        
        try {
            const result = convertFormat(geojsonInput, inputFormat, targetFormat, inputSRS, selectedSRS);
            setConvertedOutput(result);
        } catch (error) {
            console.error('Conversion failed:', error);
            setConvertedOutput(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleApplyGeometry = () => {
        if (!geojsonInput.trim()) return;
        
        try {
            // Convert input to GeoJSON format for consistency with SRS transformation
            const geojson = convertToGeoJSON(geojsonInput, inputFormat, inputSRS, 'EPSG:4326');

            // notify parent component that a new geometry GeoJSON should be drawn
            if (onApply) {
                onApply(geojson);
            }
        } catch (error) {
            console.error('Invalid input:', error);
        }
    };

    return (
        <div className="side-panel p-4 shadow-lg w-full">
            <h2 className="text-lg font-bold mb-4">Spatial Reference</h2>
            
            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Input SRS:</label>
                <select
                    value={inputSRS}
                    onChange={(e) => setInputSRS(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    {spatialReferences.map((srs) => (
                        <option key={srs.value} value={srs.value}>
                            {srs.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Output SRS:</label>
                <select
                    value={selectedSRS}
                    onChange={(e) => setSelectedSRS(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    {spatialReferences.map((srs) => (
                        <option key={srs.value} value={srs.value}>
                            {srs.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Input Format:</label>
                <select
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value as InputFormat)}
                    className="w-full p-2 border rounded"
                >
                    {inputFormats.map((format) => (
                        <option key={format.value} value={format.value}>
                            {format.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Geometry Input:</label>
                <textarea
                    value={geojsonInput}
                    onChange={(e) => setGeoJSONInput(e.target.value)}
                    placeholder={`Paste ${inputFormat.toUpperCase()} here...`}
                    className="w-full p-2 border rounded h-32 resize-none"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Convert To:</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleConvert('wkt')}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded text-sm"
                    >
                        WKT
                    </button>
                    <button
                        onClick={() => handleConvert('geojson')}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded text-sm"
                    >
                        GeoJSON
                    </button>
                    <button
                        onClick={() => handleConvert('arcgis')}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded text-sm"
                    >
                        ArcGIS
                    </button>
                </div>
            </div>

            {convertedOutput && (
                <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">Converted Output:</label>
                    <textarea
                        value={convertedOutput}
                        readOnly
                        className="w-full p-2 border rounded h-32 resize-none"
                    />
                </div>
            )}

            <button
                onClick={handleApplyGeometry}
                className="w-full bg-blue-500 hover:bg-blue-600 font-semibold py-2 rounded"
            >
                Apply
            </button>
        </div>
    );
};