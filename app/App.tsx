import { useEffect, useState } from 'react';
import Map from 'react-map-gl/mapbox';
import { type MapboxConfig } from '../api/fetchers/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

export function App() {
  const [config, setConfig] = useState<MapboxConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((data: MapboxConfig & { error?: string }) => {
        if (data.error || !data.MAPBOX_PUBLIC_TOKEN) {
          setError(data.error ?? 'Failed to load config');
        } else {
          setConfig(data);
        }
      })
      .catch(() => setError('Failed to load config'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!config) return null;

  return (
    <Map
      mapboxAccessToken={config.MAPBOX_PUBLIC_TOKEN}
      initialViewState={{
        longitude: Number(config.MAP_LONG),
        latitude: Number(config.MAP_LAT),
        zoom: Number(config.MAP_ZOOM),
      }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={config.MAP_STYLE}
    />
  );
}

export default App;
