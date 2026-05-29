import { useState } from 'react'
import './App.css'
import { Map } from './components/map'
import { SidePanel } from './components/side-panel'

function App() {
  // this state will hold the latest GeoJSON string that should be drawn on the map
  const [geometryGeoJSON, setGeometryGeoJSON] = useState<string>('');

  return (
    <>
      <div className="flex h-screen">
        <div className="w-2/3">
          <Map geojson={geometryGeoJSON} />
        </div>
        <div className="w-1/3 h-full overflow-y-auto">
          <SidePanel onApply={setGeometryGeoJSON} />
        </div>
      </div>
    </>
  )
}

export default App
