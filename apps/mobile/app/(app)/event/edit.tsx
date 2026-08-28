import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateEventSchema, type UpdateEventInput, Difficulty } from '@sportup/shared';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { eventService } from '../../../src/services/event.service';
import { api } from '../../../src/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from '../../../src/components/common/MapView';
import * as Location from 'expo-location';
import { getDistanceKm } from '../../../src/utils/distance';
export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Details, 2 = Route Map
  const [mapMode, setMapMode] = useState<'start' | 'route'>('start');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(new Date(Date.now() + 86400000));

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id as string),
  });

  const { control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
  });

  const [selectedCoord, setSelectedCoord] = useState<{lat: number; lng: number}>({ lat: 48.8566, lng: 2.3522 });
  const [routeCoords, setRouteCoords] = useState<Array<{ lat: number; lng: number }>>([]);

  const watchDistanceKm = watch('distanceKm');

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description,
        sportId: event.sportId,
        difficulty: event.difficulty || Difficulty.BEGINNER,
        maxParticipants: event.maxParticipants || 10,
        startAt: new Date(event.startAt).toISOString(),
        durationMin: event.durationMin || 60,
        distanceKm: event.distanceKm || 0,
        locationName: event.locationName || '',
        city: event.city || '',
        region: event.region || '',
        country: event.country || '',
        country: event.country || '',
      });
      setPickedDate(new Date(event.startAt));
      setSelectedCoord({ lat: event.lat, lng: event.lng });
      
      // Load existing route points if any
      if (event.route?.points) {
        try {
          const pts = typeof event.route.points === 'string' 
            ? JSON.parse(event.route.points) 
            : event.route.points;
          if (Array.isArray(pts)) {
            const sortedPts = [...pts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setRouteCoords(sortedPts.map(p => ({ lat: p.lat, lng: p.lng })));
          }
        } catch {
          setRouteCoords([]);
        }
      }
    }
  }, [event]);

  const selectedDifficulty = watch('difficulty');

  // Sync coords
  useEffect(() => {
    setValue('lat', selectedCoord.lat);
    setValue('lng', selectedCoord.lng);
  }, [selectedCoord]);

  // Recalculate route distance in KM when routeCoords change
  useEffect(() => {
    if (routeCoords.length === 0) {
      return;
    }
    let totalDist = 0;
    let prev = selectedCoord;
    for (const pt of routeCoords) {
      totalDist += getDistanceKm(prev.lat, prev.lng, pt.lat, pt.lng);
      prev = pt;
    }
    setValue('distanceKm', Math.round(totalDist * 10) / 10);
  }, [routeCoords, selectedCoord]);

  const triggerReverseGeocoding = async (lat: number, lng: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode && geocode.length > 0) {
        const g = geocode[0];
        setValue('locationName', g.street || g.name || 'Custom Meeting Point');
        setValue('city', g.city || g.subregion || g.region || '');
        setValue('region', g.region || '');
        setValue('country', g.country || '');
      }
    } catch {
      // Fallback
    }
  };

  const useCurrentGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setSelectedCoord(nextCoords);
      triggerReverseGeocoding(nextCoords.lat, nextCoords.lng);
    } catch {}
  };

  const handleMapPress = (e: any) => {
    const coordinate = e.nativeEvent?.coordinate;
    if (!coordinate) return;

    if (mapMode === 'start') {
      const nextCoords = { lat: coordinate.latitude, lng: coordinate.longitude };
      setSelectedCoord(nextCoords);
      triggerReverseGeocoding(nextCoords.lat, nextCoords.lng);
    } else {
      setRouteCoords(prev => [...prev, { lat: coordinate.latitude, lng: coordinate.longitude }]);
    }
  };

  const onSubmit = async (data: UpdateEventInput) => {
    try {
      setIsLoading(true);
      const startAtDate = data.startAt ? new Date(data.startAt) : null;
      if (startAtDate && isNaN(startAtDate.getTime())) {
        throw new Error('Invalid date format. Please enter a valid date.');
      }

      await api.patch(`/events/${id}`, {
        ...data,
        startAt: startAtDate ? startAtDate.toISOString() : undefined,
        lat: selectedCoord.lat,
        lng: selectedCoord.lng,
        routeCoordinates: routeCoords,
      });

      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });

      Alert.alert('Saved!', 'Your run has been updated.', [
        { text: 'View Run', onPress: () => router.replace(`/(app)/event/${id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  if (eventLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.textMuted }}>Loading run details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Wizard Progress Bar ── */}
      <View style={styles.wizardProgress}>
        <View style={[styles.progressStep, step >= 1 && styles.progressActive]}>
          <Text style={styles.progressStepNum}>1</Text>
          <Text style={styles.progressStepLabel}>Info</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={[styles.progressStep, step >= 2 && styles.progressActive]}>
          <Text style={styles.progressStepNum}>2</Text>
          <Text style={styles.progressStepLabel}>Route</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View>
            <Text style={styles.pageTitle}>Edit Run Activity</Text>

            <Text style={styles.sectionTitle}>Details</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Event Title"
                  placeholder="e.g. Sunday Morning Run"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.title?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Description"
                  placeholder="Tell others what to expect..."
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.description?.message}
                />
              )}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="maxParticipants"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Max People"
                      keyboardType="numeric"
                      onChangeText={(val) => onChange(parseInt(val) || 10)}
                      value={value != null ? String(value) : ''}
                      error={errors.maxParticipants?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="distanceKm"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Distance (km)"
                      keyboardType="numeric"
                      onChangeText={(val) => {
                        const parsed = parseFloat(val);
                        onChange(isNaN(parsed) ? undefined : parsed);
                      }}
                      value={value != null ? String(value) : ''}
                      error={errors.distanceKm?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="startAt"
              render={({ field: { onChange, value } }) => {
                const dateObj = pickedDate;
                const dateLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const timeLabel = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const dayLabel = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });

                const handleDateChange = (_: any, selected?: Date) => {
                  setShowDatePicker(false);
                  if (selected) {
                    const updated = new Date(selected);
                    updated.setHours(dateObj.getHours(), dateObj.getMinutes());
                    setPickedDate(updated);
                    onChange(updated.toISOString());
                    if (Platform.OS === 'android') setShowTimePicker(true);
                  }
                };

                const handleTimeChange = (_: any, selected?: Date) => {
                  setShowTimePicker(false);
                  if (selected) {
                    const updated = new Date(dateObj);
                    updated.setHours(selected.getHours(), selected.getMinutes());
                    setPickedDate(updated);
                    onChange(updated.toISOString());
                  }
                };

                return (
                  <>
                    <Text style={styles.sectionLabel}>Date &amp; Time</Text>
                    <View style={styles.dateTimeRow}>
                      {/* Date selector */}
                      <TouchableOpacity
                        style={styles.dateTimeBtn}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.dateTimeIcon}>📅</Text>
                        <Text style={styles.dateTimeSub}>Date</Text>
                        <Text style={styles.dateTimeVal} numberOfLines={1} adjustsFontSizeToFit>{dateLabel}</Text>
                        <Text style={styles.dateTimeSub2} numberOfLines={1}>{dayLabel}</Text>
                      </TouchableOpacity>

                      {/* Time selector */}
                      <TouchableOpacity
                        style={styles.dateTimeBtn}
                        onPress={() => setShowTimePicker(true)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.dateTimeIcon}>⏰</Text>
                        <Text style={styles.dateTimeSub}>Time</Text>
                        <Text style={styles.dateTimeVal}>{timeLabel}</Text>
                      </TouchableOpacity>
                    </View>

                    {errors.startAt && <Text style={styles.errorText}>{errors.startAt.message}</Text>}

                    {showDatePicker && (
                      <DateTimePicker
                        value={dateObj}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                        themeVariant="dark"
                      />
                    )}
                    {showTimePicker && (
                      <DateTimePicker
                        value={dateObj}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                        themeVariant="dark"
                      />
                    )}
                  </>
                );
              }}
            />

            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {([
                { value: Difficulty.BEGINNER,     label: 'Beginner' },
                { value: Difficulty.INTERMEDIATE, label: 'Medium'   },
                { value: Difficulty.ADVANCED,     label: 'Advanced' },
                { value: Difficulty.ELITE,        label: 'Elite'    },
              ] as const).map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.difficultyBtn, selectedDifficulty === value && styles.difficultyBtnActive]}
                  onPress={() => setValue('difficulty', value)}
                >
                  <Text style={[styles.difficultyText, selectedDifficulty === value && styles.difficultyTextActive]} numberOfLines={1}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Continue to Route Map →" onPress={() => setStep(2)} style={styles.submitBtn} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.pageTitle}>🗺️ Edit Route & Location</Text>

            <View style={styles.mapControlsRow}>
              <TouchableOpacity 
                style={[styles.controlTab, mapMode === 'start' && styles.controlTabActive]} 
                onPress={() => setMapMode('start')}
              >
                <Text style={[styles.controlTabText, mapMode === 'start' && styles.controlTabTextActive]}>📍 Start Point</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.controlTab, mapMode === 'route' && styles.controlTabActive]} 
                onPress={() => setMapMode('route')}
              >
                <Text style={[styles.controlTabText, mapMode === 'route' && styles.controlTabTextActive]}>✏️ Draw Route</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapBoxContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: selectedCoord.lat,
                  longitude: selectedCoord.lng,
                  latitudeDelta: 0.03,
                  longitudeDelta: 0.03,
                }}
                onPress={handleMapPress}
                routeCoordinates={routeCoords}
              >
                <Marker coordinate={{ latitude: selectedCoord.lat, longitude: selectedCoord.lng }} />
                {routeCoords.map((pt, idx) => (
                  <Marker key={idx} coordinate={{ latitude: pt.lat, longitude: pt.lng }} pinColor="#ff6b35" />
                ))}
                {routeCoords.length > 0 && (
                  <Polyline 
                    coordinates={[{ latitude: selectedCoord.lat, longitude: selectedCoord.lng }, ...routeCoords.map(c => ({ latitude: c.lat, longitude: c.lng }))]}
                    strokeColor="#ff6b35"
                    strokeWidth={4}
                  />
                )}
              </MapView>
            </View>

            <View style={styles.routeStatsBox}>
              <Text style={styles.routeStatLabel}>🏃 Route Distance</Text>
              <Text style={styles.routeStatValue}>{watchDistanceKm} KM</Text>
            </View>

            <View style={styles.gpsRow}>
              <Button title="Use GPS Location 📍" variant="secondary" onPress={useCurrentGPS} style={styles.flexBtn} />
              {routeCoords.length > 0 && (
                <Button title="Clear Route 🗑" variant="outline" onPress={() => setRouteCoords([])} style={[styles.flexBtn, { marginLeft: theme.spacing.sm }]} />
              )}
            </View>

            <Text style={styles.sectionTitle}>Start Address Details</Text>
            <Controller
              control={control}
              name="locationName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Meeting Point Name"
                  placeholder="e.g. Main Gate Entrance"
                  onChangeText={onChange}
                  value={value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="City"
                  placeholder="e.g. Tunis"
                  onChangeText={onChange}
                  value={value || ''}
                />
              )}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="region"
                  render={({ field: { onChange, value } }) => (
                    <TextInput label="Region" onChangeText={onChange} value={value || ''} />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="country"
                  render={({ field: { onChange, value } }) => (
                    <TextInput label="Country" onChangeText={onChange} value={value || ''} />
                  )}
                />
              </View>
            </View>

            <View style={styles.row}>
              <Button title="← Back" variant="ghost" onPress={() => setStep(1)} style={styles.flexBtn} />
              <Button title="Save Changes 💾" onPress={handleSubmit(onSubmit)} isLoading={isLoading} style={[styles.flexBtn, { marginLeft: theme.spacing.sm }]} />
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  wizardProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  progressStep: { alignItems: 'center', opacity: 0.4 },
  progressActive: { opacity: 1 },
  progressStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: 'bold', fontSize: 12 },
  progressStepLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, fontFamily: theme.typography.fontFamily.bold },
  progressLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: theme.spacing.sm },
  scroll: { padding: theme.spacing.xl, paddingBottom: 40 },
  pageTitle: { fontSize: theme.typography.size.xl, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.size.lg, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  sectionLabel: { fontSize: theme.typography.size.sm, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  dateTimeBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minHeight: 88 },
  dateTimeIcon: { fontSize: 26, marginBottom: 6 },
  dateTimeSub: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateTimeSub2: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11, marginTop: 2 },
  dateTimeVal: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 14, textAlign: 'center' },
  errorText: { color: theme.colors.error, fontSize: theme.typography.size.sm, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  col: { flex: 1 },
  difficultyRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  difficultyBtn: { flex: 1, height: 44, backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  difficultyBtnActive: { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderColor: theme.colors.primary, borderWidth: 1 },
  difficultyText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 12, textAlign: 'center' },
  difficultyTextActive: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold },
  submitBtn: { width: '100%', marginTop: theme.spacing.lg },
  mapControlsRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, padding: 4, marginBottom: theme.spacing.md },
  controlTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.border.radius.sm },
  controlTabActive: { backgroundColor: theme.colors.primary },
  controlTabText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold, fontSize: 13 },
  controlTabTextActive: { color: '#fff' },
  mapBoxContainer: { height: 320, borderRadius: theme.border.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.surfaceElevated, marginBottom: theme.spacing.md },
  map: { width: '100%', height: '100%' },
  routeStatsBox: { backgroundColor: 'rgba(255, 107, 53, 0.12)', borderRadius: theme.border.radius.md, padding: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.md },
  routeStatLabel: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeStatValue: { color: theme.colors.primary, fontSize: 28, fontFamily: theme.typography.fontFamily.bold, marginTop: 4 },
  gpsRow: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  flexBtn: { flex: 1 },
});
