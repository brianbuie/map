import { useEffect, useState } from 'react';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

export function App() {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.mapboxToken) setMapboxToken(data.mapboxToken);
        else setError(data.error ?? 'Failed to load config');
      })
      .catch(() => setError('Failed to load config'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!mapboxToken) return null;

  return (
    <Map
      mapboxAccessToken={mapboxToken}
      initialViewState={{ longitude: -94.708316, latitude: 38.94176, zoom: 10 }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle="mapbox://styles/brianbuie1/cmq1cmdlw001y01qu5s5o5nn3"
    />
  );
}

export default App;
