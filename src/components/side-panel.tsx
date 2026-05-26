import React, { useState } from 'react';
import proj4 from 'proj4';
import { wktToGeoJSON, geojsonToWKT } from "@terraformer/wkt"
import { arcgisToGeoJSON, geojsonToArcGIS } from "@terraformer/arcgis";

interface SidePanelProps {
    /** called when the user clicks the apply button with the current geometry data */
    onApply?: (geojson: string) => void;
}

type InputFormat = 'wkt' | 'geojson' | 'arcgis';

export const SidePanel: React.FC<SidePanelProps> = ({ onApply }) => {
    const [selectedSRS, setSelectedSRS] = useState('EPSG:4326');
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

    const convertToGeoJSON = (input: string, format: InputFormat): string => {
        try {
            if (format === 'wkt') {
                return JSON.stringify(wktToGeoJSON(input));
            } else if (format === 'geojson') {
                return input;
            } else if (format === 'arcgis') {
                const arcgisJson = JSON.parse(input);
                return JSON.stringify(arcgisToGeoJSON(arcgisJson));
            }
            return input;
        } catch (error) {
            console.error('Conversion error:', error);
            throw new Error(`Failed to convert from ${format} to WKT: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const convertFormat = (input: string, fromFormat: InputFormat, toFormat: InputFormat): string => {
        try {
            if (fromFormat === toFormat) {
                return input;
            }
            
            // First convert to WKT as intermediate format
            const geoJSONString = convertToGeoJSON(input, fromFormat);
            
            // Then convert from WKT to target format
            if (toFormat === 'wkt') {
                return geojsonToWKT(JSON.parse(geoJSONString));
            } else if (toFormat === 'geojson') {
                return geoJSONString;
            } else if (toFormat === 'arcgis') {
                return JSON.stringify(geojsonToArcGIS(JSON.parse(geoJSONString)));
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
            const result = convertFormat(geojsonInput, inputFormat, targetFormat);
            setConvertedOutput(result);
        } catch (error) {
            console.error('Conversion failed:', error);
            setConvertedOutput(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleApplyGeometry = () => {
        if (!geojsonInput.trim()) return;
        
        try {
            // Convert input to GeoJSON format for consistency
            const geojson = convertToGeoJSON(geojsonInput, inputFormat);

            // register a custom CRS definition if the user has provided one
            // var targetCoordinates = proj4(selectedSRS);
            // console.log('GeoJSON applied (CRS):', selectedSRS, geojson);

            // notify parent component that a new geometry GeoJSON should be drawn
            if (onApply) {
                onApply(geojson);
                console.log('Geometry applied (as geoJson):', geojson);
            }
        } catch (error) {
            console.error('Invalid input:', error);
        }
    };

    return (
        <div className="side-panel p-4 shadow-lg w-full">
            <h2 className="text-lg font-bold mb-4">Spatial Reference</h2>
            
            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Select SRS:</label>
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