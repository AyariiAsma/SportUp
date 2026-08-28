import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

export const Marker = ({ children }: any) => <View>{children}</View>;
export const Callout = ({ children }: any) => <View>{children}</View>;
export const Polyline = ({ coordinates, strokeColor, strokeWidth }: any) => {
  return null;
};

interface MapViewProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onPress?: (event: any) => void;
  // Custom prop to pass running route coordinates for visual rendering in mock web map
  routeCoordinates?: Array<{ lat: number; lng: number }>;
}

const MapView = ({ children, style, initialRegion, onPress, routeCoordinates = [] }: MapViewProps) => {
  const lat = initialRegion?.latitude ?? 48.8566;
  const lng = initialRegion?.longitude ?? 2.3522;

  // Let's create an interactive grid where tapping on different corners changes the lat/lng coordinates relative to the start.
  const handleGridTap = (percentX: number, percentY: number) => {
    if (!onPress) return;
    // Calculate new coordinate relative to the current region
    const deltaLat = (0.5 - percentY) * 0.02;
    const deltaLng = (percentX - 0.5) * 0.02;
    const clickLat = lat + deltaLat;
    const clickLng = lng + deltaLng;

    onPress({
      nativeEvent: {
        coordinate: {
          latitude: clickLat,
          longitude: clickLng,
        },
      },
    });
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>🗺️ Interactive Route Map (Web Mode)</Text>
      
      {/* ── Simulated Map Grid ── */}
      <TouchableOpacity 
        style={styles.gridCanvas}
        activeOpacity={0.9}
        onPress={(e) => {
          // Calculate relative click percent on the container
          const layoutX = e.nativeEvent.locationX || 150;
          const layoutY = e.nativeEvent.locationY || 90;
          handleGridTap(layoutX / 300, layoutY / 180);
        }}
      >
        <Text style={styles.canvasPlaceholder}>📍 Tap anywhere inside this box to place points</Text>

        {/* Start Pin */}
        <View style={[styles.pin, { top: '50%', left: '50%', transform: [{ translateX: -10 }, { translateY: -10 }] }]}>
          <Text style={{ fontSize: 16 }}>🚩</Text>
        </View>

        {/* Route Points */}
        {routeCoordinates.map((pt, idx) => {
          // Calculate screen position relative to start point
          const offsetLat = pt.lat - lat;
          const offsetLng = pt.lng - lng;
          // Scale offset to percentage (assuming 0.02 max delta maps to 100%)
          const topPercent = 50 - (offsetLat / 0.02) * 50;
          const leftPercent = 50 + (offsetLng / 0.02) * 50;

          if (topPercent < 0 || topPercent > 100 || leftPercent < 0 || leftPercent > 100) return null;

          return (
            <View 
              key={idx} 
              style={[
                styles.routePointNode, 
                { top: `${topPercent}%`, left: `${leftPercent}%` }
              ]}
            >
              <Text style={styles.pointText}>{idx + 1}</Text>
            </View>
          );
        })}
      </TouchableOpacity>

      <Text style={styles.hint}>💡 Click points inside the map to draw your route path</Text>
      
      <View style={styles.coordDisplay}>
        <Text style={styles.coordText}>📌 Start: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        {routeCoordinates.length > 0 && (
          <Text style={styles.routeCountText}>⚡ Route Nodes: {routeCoordinates.length} points</Text>
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1d2733',
    borderRadius: 12,
    padding: 12,
    minHeight: 280,
  },
  title: {
    color: '#ff6b35',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gridCanvas: {
    height: 180,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasPlaceholder: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    pointerEvents: 'none',
  },
  pin: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  routePointNode: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff6b35',
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    zIndex: 5,
  },
  pointText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  coordDisplay: {
    marginTop: 8,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  routeCountText: {
    color: '#ff6b35',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MapView;
