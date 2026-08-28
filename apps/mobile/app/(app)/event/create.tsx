import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, type CreateEventInput, Difficulty } from '@sportup/shared';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { Select } from '../../../src/components/common/Select';
import { TUNISIA_GOVERNORATES, getVillesForGovernorate } from '../../../src/utils/tunisia';
import { eventService } from '../../../src/services/event.service';
import { sportService } from '../../../src/services/sport.service';
import { useLocationStore } from '../../../src/stores/location.store';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from '../../../src/components/common/MapView';
import * as Location from 'expo-location';
import { getDistanceKm } from '../../../src/utils/distance';

export default function CreateEventScreen() {
  const router = useRouter();
  const { latitude, longitude, city: userCity } = useLocationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mapMode, setMapMode] = useState<'start' | 'route'>('start');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [showAddressEdit, setShowAddressEdit] = useState(false);

  const [selectedCoord, setSelectedCoord] = useState<{lat: number; lng: number}>({
    lat: latitude || 48.8566,
    lng: longitude || 2.3522
  });

  const [routeCoords, setRouteCoords] = useState<Array<{ lat: number; lng: number }>>([]);

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportService.getSports(),
  });

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      sportId: '',
      difficulty: Difficulty.BEGINNER,
      maxParticipants: 10,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      durationMin: 60,
      lat: selectedCoord.lat,
      lng: selectedCoord.lng,
      city: userCity || '',
      locationName: '',
      region: '',
      country: '',
      distanceKm: 0,
    }
  });

  const selectedSportId = watch('sportId');
  const selectedDifficulty = watch('difficulty');
  const watchLocationName = watch('locationName');
  const watchCity = watch('city');
  const watchRegion = watch('region');
  const watchCountry = watch('country');
  const watchDistanceKm = watch('distanceKm');
  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchStartAt = watch('startAt');

  // Automatically update start coordinates in the form
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
        const locationName = g.street || g.name || 'Custom Start Point';
        const cityVal = g.city || g.subregion || g.region || '';
        const regionVal = g.region || '';
        const countryVal = g.country || '';

        setValue('locationName', locationName);
        setValue('city', cityVal);
        setValue('region', regionVal);
        setValue('country', countryVal);
      }
    } catch {
      // Fallback
      setValue('locationName', 'Selected Coordinate');
      setValue('city', userCity || 'Paris');
    }
  };

  // Move map starting point to user GPS
  const useCurrentGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need GPS permission to pan to your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setSelectedCoord(nextCoords);
      triggerReverseGeocoding(nextCoords.lat, nextCoords.lng);
    } catch (err) {
      Alert.alert('Error', 'Could not retrieve GPS coordinates.');
    }
  };

  const handleMapPress = (e: any) => {
    const coordinate = e.nativeEvent?.coordinate;
    if (!coordinate) return;

    if (mapMode === 'start') {
      const nextCoords = { lat: coordinate.latitude, lng: coordinate.longitude };
      setSelectedCoord(nextCoords);
      triggerReverseGeocoding(nextCoords.lat, nextCoords.lng);
    } else {
      // Drawing route
      setRouteCoords(prev => [...prev, { lat: coordinate.latitude, lng: coordinate.longitude }]);
    }
  };

  const onSubmit = async (data: CreateEventInput) => {
    try {
      setIsLoading(true);
      const startAtDate = new Date(data.startAt);
      if (isNaN(startAtDate.getTime())) {
        throw new Error('Invalid date format');
      }

      const newEvent = await eventService.createEvent({
        ...data,
        startAt: startAtDate.toISOString(),
        lat: selectedCoord.lat,
        lng: selectedCoord.lng,
        // Send the drawn coordinates array to be saved in EventRoute
        routeCoordinates: routeCoords,
      } as any);

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'View Event', onPress: () => router.replace(`/(app)/event/${newEvent.id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

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
        <View style={styles.progressLine} />
        <View style={[styles.progressStep, step >= 3 && styles.progressActive]}>
          <Text style={styles.progressStepNum}>3</Text>
          <Text style={styles.progressStepLabel}>Preview</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View>
            <Text style={styles.pageTitle}>Create Run Activity</Text>
            
            <Text style={styles.sectionTitle}>Select Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {sports.map(sport => (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.chip, selectedSportId === sport.id && styles.chipActive]}
                  onPress={() => setValue('sportId', sport.id, { shouldValidate: true })}
                >
                  <Text style={[styles.chipText, selectedSportId === sport.id && styles.chipTextActive]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {errors.sportId && <Text style={styles.errorText}>{errors.sportId.message}</Text>}

            <Text style={styles.sectionTitle}>Details</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Event Title"
                  placeholder="e.g. Morning Jog in the Park"
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
                  placeholder="Tell other runners what to expect..."
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
                      value={String(value)}
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

            <Button title="Continue to Route Map" onPress={() => setStep(2)} style={styles.submitBtn} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.pageTitle}>🗺️ Location & Route</Text>

            {/* Map Mode Buttons */}
            <View style={styles.mapControlsRow}>
              <TouchableOpacity 
                style={[styles.controlTab, mapMode === 'start' && styles.controlTabActive]} 
                onPress={() => setMapMode('start')}
              >
                <Text style={[styles.controlTabText, mapMode === 'start' && styles.controlTabTextActive]}>📍 1. Start Point</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.controlTab, mapMode === 'route' && styles.controlTabActive]} 
                onPress={() => setMapMode('route')}
              >
                <Text style={[styles.controlTabText, mapMode === 'route' && styles.controlTabTextActive]}>✏️ 2. Draw Route</Text>
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
                {/* Starting point marker */}
                <Marker coordinate={{ latitude: selectedCoord.lat, longitude: selectedCoord.lng }} />
                
                {/* Route points markers */}
                {routeCoords.map((pt, idx) => (
                  <Marker 
                    key={idx} 
                    coordinate={{ latitude: pt.lat, longitude: pt.lng }} 
                    pinColor="#ff6b35"
                  />
                ))}

                {/* Polyline route connector */}
                {routeCoords.length > 0 && (
                  <Polyline 
                    coordinates={[
                      { latitude: selectedCoord.lat, longitude: selectedCoord.lng },
                      ...routeCoords.map(c => ({ latitude: c.lat, longitude: c.lng }))
                    ]}
                    strokeColor="#ff6b35"
                    strokeWidth={4}
                  />
                )}
              </MapView>
            </View>

            {/* Route Stats */}
            <View style={styles.routeStatsBox}>
              <Text style={styles.routeStatLabel}>🏃 Route Distance</Text>
              <Text style={styles.routeStatValue}>{watchDistanceKm} KM</Text>
            </View>

            <View style={styles.gpsRow}>
              <Button title="Use GPS Location 📍" variant="secondary" onPress={useCurrentGPS} style={styles.flexBtn} />
              {routeCoords.length > 0 && (
                <Button 
                  title="Clear Route 🗑️" 
                  variant="outline" 
                  onPress={() => setRouteCoords([])} 
                  style={[styles.flexBtn, { marginLeft: theme.spacing.sm }]} 
                />
              )}
            </View>

            {/* ── Auto Address Card (from map tap) ── */}
            <Text style={styles.sectionTitle}>📍 Start Location</Text>

            {(watchLocationName || watchCity) ? (
              <View style={styles.addressCard}>
                <View style={styles.addressCardHeader}>
                  <Text style={styles.addressCardIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {watchLocationName ? (
                      <Text style={styles.addressCardName}>{watchLocationName}</Text>
                    ) : null}
                    <Text style={styles.addressCardSub}>
                      {[watchCity, watchRegion, watchCountry].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addressEditToggle}
                    onPress={() => setShowAddressEdit(v => !v)}
                  >
                    <Text style={styles.addressEditToggleText}>{showAddressEdit ? 'Done' : 'Edit'}</Text>
                  </TouchableOpacity>
                </View>

                {showAddressEdit && (
                  <View style={styles.addressEditPanel}>
                    <Controller
                      control={control}
                      name="region"
                      render={({ field: { onChange, value } }) => (
                        <Select
                          label="Governorate"
                          placeholder="Select Governorate"
                          selectedValue={value || ''}
                          onValueChange={(val) => {
                            onChange(val);
                            // Reset Ville when Governorate changes
                            setValue('city', '');
                          }}
                          options={TUNISIA_GOVERNORATES}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="city"
                      render={({ field: { onChange, value } }) => {
                        const currentGov = watchRegion;
                        const villeOptions = currentGov ? getVillesForGovernorate(currentGov) : [];
                        return (
                          <Select
                            label="Ville / Delegation"
                            placeholder={currentGov ? "Select Ville" : "Select Governorate first"}
                            selectedValue={value || ''}
                            onValueChange={onChange}
                            options={villeOptions}
                          />
                        );
                      }}
                    />
                    <Controller
                      control={control}
                      name="locationName"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          label="Localité / Address"
                          placeholder="e.g. Lac 1, Carthage, Centre Ville"
                          onChangeText={onChange}
                          value={value || ''}
                        />
                      )}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.addressEmptyCard}>
                <Text style={styles.addressEmptyIcon}>🗺️</Text>
                <Text style={styles.addressEmptyTitle}>Tap on the map to set start point</Text>
                <Text style={styles.addressEmptyHint}>Your GPS coordinates will be auto-detected and the address filled in automatically.</Text>
                <Button
                  title="Use My GPS Location"
                  variant="outline"
                  onPress={useCurrentGPS}
                  style={{ marginTop: theme.spacing.md }}
                />
              </View>
            )}

            <View style={styles.navRow}>
              <Button title="Back" variant="ghost" onPress={() => setStep(1)} style={styles.flexBtn} />
              <Button title="Continue to Preview" onPress={() => setStep(3)} style={styles.flexBtn} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.previewBox}>
            <Text style={styles.pageTitle}>🔍 Preview Running Event</Text>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{watchTitle || 'No Title'}</Text>
              <Text style={styles.previewDistance}>📏 {watchDistanceKm} KM Run</Text>
              
              <Text style={styles.previewLabel}>Description</Text>
              <Text style={styles.previewText}>{watchDescription || 'No description provided.'}</Text>
              
              <Text style={styles.previewLabel}>📍 Starting Point</Text>
              <Text style={styles.previewText}>
                {watchLocationName ? `${watchLocationName}, ` : ''}
                {watchCity ? `${watchCity}, ` : ''}
                {watchRegion ? `${watchRegion}, ` : ''}
                {watchCountry || ''}
              </Text>
              
              <Text style={styles.previewLabel}>⏰ Planned Date</Text>
              <Text style={styles.previewText}>{watchStartAt}</Text>
            </View>

            <View style={styles.navRow}>
              <Button title="Edit Route" variant="ghost" onPress={() => setStep(2)} style={styles.flexBtn} />
              <Button
                title="Publish Run"
                onPress={handleSubmit(onSubmit)}
                isLoading={isLoading}
                style={styles.flexBtn}
              />
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
  scroll: { padding: theme.spacing.xl, paddingBottom: 120 },
  pageTitle: { fontSize: theme.typography.size.xl, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.size.lg, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  sectionLabel: { fontSize: theme.typography.size.sm, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateTimeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  dateTimeBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minHeight: 88 },
  dateTimeIcon: { fontSize: 26, marginBottom: 6 },
  dateTimeSub: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateTimeSub2: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11, marginTop: 2 },
  dateTimeVal: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 14, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  chip: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.border.radius.round, marginRight: theme.spacing.sm },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium },
  chipTextActive: { color: theme.colors.text },
  errorText: { color: theme.colors.error, fontSize: theme.typography.size.sm, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  col: { flex: 1 },
  difficultyRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  difficultyBtn: { flex: 1, height: 44, backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  difficultyBtnActive: { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderColor: theme.colors.primary, borderWidth: 1 },
  difficultyText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 12, textAlign: 'center' },
  difficultyTextActive: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold },
  submitBtn: { width: '100%', marginTop: theme.spacing.lg },
  navRow: { flexDirection: 'row', gap: theme.spacing.sm },
  bottomBarWrapper: { backgroundColor: theme.colors.surface },
  bottomBar: { padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
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
  previewBox: { marginTop: theme.spacing.md },
  previewCard: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.lg, padding: theme.spacing.xl, marginBottom: theme.spacing.lg },
  previewTitle: { fontSize: theme.typography.size.lg, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  previewDistance: { fontSize: theme.typography.size.md, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.primary, marginBottom: theme.spacing.md },
  previewLabel: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', fontFamily: theme.typography.fontFamily.bold, marginTop: theme.spacing.md, marginBottom: 2 },
  previewText: { fontSize: 13, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.medium },
  addressCard: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: theme.spacing.lg },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: 'rgba(255,107,53,0.05)' },
  addressCardIcon: { fontSize: 24, marginRight: theme.spacing.sm },
  addressCardName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 15, marginBottom: 2 },
  addressCardSub: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 12 },
  addressEditToggle: { padding: theme.spacing.sm, backgroundColor: 'rgba(255,107,53,0.1)', borderRadius: theme.border.radius.round, marginLeft: theme.spacing.sm },
  addressEditToggleText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 11 },
  addressEditPanel: { padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  addressEmptyCard: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.lg, padding: theme.spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', marginBottom: theme.spacing.lg },
  addressEmptyIcon: { fontSize: 32, marginBottom: theme.spacing.sm },
  addressEmptyTitle: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 16, marginBottom: 4, textAlign: 'center' },
  addressEmptyHint: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
