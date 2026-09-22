import { Camera, type CameraRef, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoutePoint } from '../types';
import { colors, radii, spacing } from '../theme';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

interface Props {
  route: RoutePoint[];
  title?: string;
  height?: number;
}

export function RouteMap({ route, title = 'Маршрут', height = 180 }: Props) {
  const cameraRef = useRef<CameraRef>(null);

  const last = route[route.length - 1];

  useEffect(() => {
    if (last) {
      cameraRef.current?.jumpTo({ center: [last.lng, last.lat] });
    }
  }, [last?.lat, last?.lng]);

  if (route.length === 0) {
    return (
      <View style={[styles.card, { height: height + 44 }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ожидание GPS-сигнала…</Text>
        </View>
      </View>
    );
  }

  const coordinates: [number, number][] = route.map((point) => [point.lng, point.lat]);
  const first = coordinates[0];
  const lastCoord = coordinates[coordinates.length - 1];

  const lineGeoJson: GeoJSON.Feature = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ height, borderRadius: radii.sm, overflow: 'hidden' }}>
        <Map mapStyle={MAP_STYLE_URL} style={{ flex: 1 }}>
          <Camera ref={cameraRef} initialViewState={{ center: lastCoord, zoom: 15 }} />

          <GeoJSONSource id="route-source" data={lineGeoJson}>
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': colors.accentStart, 'line-width': 4 }}
            />
          </GeoJSONSource>

          <Marker id="start" lngLat={first}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
          </Marker>
          <Marker id="current" lngLat={lastCoord}>
            <View style={[styles.dot, { backgroundColor: colors.accentEnd }]} />
          </Marker>
        </Map>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
