import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, type CreateEventInput, Difficulty } from '@sportup/shared';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { eventService } from '../../../src/services/event.service';
import { sportService } from '../../../src/services/sport.service';
import { useLocationStore } from '../../../src/stores/location.store';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { AddressSelector } from '../../../src/components/common/AddressSelector';
import { format } from 'date-fns';

export default function CreateEventScreen() {
  const router = useRouter();
  const { latitude, longitude, city: userCity } = useLocationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(new Date(Date.now() + 86400000));

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportService.getSports(),
  });

  const { control, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      sportId: '',
      difficulty: Difficulty.BEGINNER,
      maxParticipants: 10,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      durationMin: 60,
      lat: latitude || 36.8065,
      lng: longitude || 10.1815,
      city: userCity || '',
      locationName: '',
      region: '',
      locality: '',
      country: 'Tunisia',
      distanceKm: 5,
    }
  });

  // Auto-select running sport
  useEffect(() => {
    if (sports.length > 0 && !watch('sportId')) {
      const runningSport = sports.find(s => s.name.toLowerCase() === 'running') || sports[0];
      if (runningSport) {
        setValue('sportId', runningSport.id, { shouldValidate: true });
      }
    }
  }, [sports]);

  const selectedSportId = watch('sportId');
  const selectedDifficulty = watch('difficulty');
  const watchLocationName = watch('locationName');
  const watchLocality = watch('locality');
  const watchCity = watch('city');
  const watchRegion = watch('region');
  const watchCountry = watch('country');
  const watchDistanceKm = watch('distanceKm');
  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchStartAt = watch('startAt');

  const [maxPeopleStr, setMaxPeopleStr] = useState('10');
  const [distanceStr, setDistanceStr] = useState('5');

  const handleMaxPeopleChange = (val: string, onChange: (v: any) => void) => {
    setMaxPeopleStr(val);
    if (val.trim() === '') {
      onChange(undefined);
      return;
    }
    const parsed = parseInt(val, 10);
    onChange(isNaN(parsed) ? undefined : parsed);
  };

  const handleMaxPeopleBlur = (onChange: (v: any) => void) => {
    const parsed = parseInt(maxPeopleStr, 10);
    if (isNaN(parsed) || parsed < 2) {
      setMaxPeopleStr('10');
      onChange(10);
    } else {
      setMaxPeopleStr(String(parsed));
      onChange(parsed);
    }
  };

  const handleDistanceChange = (val: string, onChange: (v: any) => void) => {
    setDistanceStr(val);
    if (val.trim() === '') {
      onChange(undefined);
      return;
    }
    const parsed = parseFloat(val);
    onChange(isNaN(parsed) ? undefined : parsed);
  };

  const handleDistanceBlur = (onChange: (v: any) => void) => {
    const parsed = parseFloat(distanceStr);
    if (isNaN(parsed) || parsed <= 0) {
      setDistanceStr('5');
      onChange(5);
    } else {
      setDistanceStr(String(parsed));
      onChange(parsed);
    }
  };

  const goToStep2 = async () => {
    handleMaxPeopleBlur((v) => setValue('maxParticipants', v));
    handleDistanceBlur((v) => setValue('distanceKm', v));
    const isTitleValid = await trigger('title');
    const isDescValid = await trigger('description');

    if (!isTitleValid || !isDescValid) {
      Alert.alert('Missing Info', 'Please provide a valid title (at least 3 characters) and description (at least 10 characters).');
      return;
    }
    setStep(2);
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
      } as any);

      Alert.alert('🎉 Run Published!', 'Your running event has been created successfully.', [
        { text: 'View Run', onPress: () => router.replace(`/(app)/event/${newEvent.id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const onFormError = (formErrors: any) => {
    const fields = Object.keys(formErrors);
    if (fields.length > 0) {
      const firstField = fields[0];
      const message = formErrors[firstField]?.message || 'Invalid value';
      Alert.alert('Form Error', `${firstField.toUpperCase()}: ${message}`);
    }
  };

  // Build clean presentable address
  const addressParts = [
    watchLocationName,
    watchLocality,
    watchCity,
    watchRegion,
    watchCountry || 'Tunisia',
  ].filter(Boolean);
  const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No specific address selected';

  // Format date time nicely for preview
  const formattedDatePreview = watchStartAt
    ? format(new Date(watchStartAt), 'EEEE, MMMM d, yyyy @ h:mm a')
    : 'Not set';

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
          <Text style={styles.progressStepLabel}>Location</Text>
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
            
            <Text style={styles.sectionTitle}>Activity Type</Text>
            <View style={styles.activityBadgeContainer}>
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeIcon}>🏃</Text>
                <Text style={styles.activityBadgeText}>Running</Text>
              </View>
              <Text style={styles.activityBadgeSubtitle}>SportUp is dedicated exclusively to running events</Text>
            </View>

            <Text style={styles.sectionTitle}>Details</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Event Title"
                  placeholder="e.g. Morning Jog in Lac 1"
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
                  placeholder="Tell other runners what pace, route or gear to expect..."
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
                  render={({ field: { onChange } }) => (
                    <TextInput
                      label="Max People"
                      keyboardType="numeric"
                      value={maxPeopleStr}
                      onChangeText={(val) => handleMaxPeopleChange(val, onChange)}
                      onBlur={() => handleMaxPeopleBlur(onChange)}
                      error={errors.maxParticipants?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="distanceKm"
                  render={({ field: { onChange } }) => (
                    <TextInput
                      label="Distance (km)"
                      keyboardType="numeric"
                      value={distanceStr}
                      onChangeText={(val) => handleDistanceChange(val, onChange)}
                      onBlur={() => handleDistanceBlur(onChange)}
                      error={errors.distanceKm?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="startAt"
              render={({ field: { onChange } }) => {
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

            <Button title="Continue to Location →" onPress={goToStep2} style={styles.submitBtn} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.pageTitle}>📍 Location</Text>

            <AddressSelector
              initialRegion={watchRegion}
              initialCity={watchCity}
              initialLocality={watchLocality}
              onChange={(region, city, locality) => {
                setValue('region', region, { shouldValidate: true });
                setValue('city', city, { shouldValidate: true });
                setValue('locality', locality, { shouldValidate: true });
              }}
            />

            <Controller
              control={control}
              name="locationName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Meeting Point / Additional Address Details (Optional)"
                  placeholder="e.g. Near the main entrance, Parking area"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.locationName?.message}
                />
              )}
            />

            <View style={styles.navRow}>
              <Button title="← Back" variant="ghost" onPress={() => setStep(1)} style={styles.flexBtn} />
              <Button title="Continue to Preview →" onPress={() => setStep(3)} style={styles.flexBtn} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.previewBox}>
            <Text style={styles.pageTitle}>🔍 Preview Running Event</Text>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{watchTitle || 'Untitled Run'}</Text>
              {watchDistanceKm ? (
                <Text style={styles.previewDistance}>📏 {watchDistanceKm} KM Run</Text>
              ) : null}
              
              <Text style={styles.previewLabel}>📝 Description</Text>
              <Text style={styles.previewText}>{watchDescription || 'No description provided.'}</Text>
              
              <Text style={styles.previewLabel}>📍 Location &amp; Meeting Point</Text>
              <Text style={styles.previewText}>{formattedAddress}</Text>
              
              <Text style={styles.previewLabel}>⏰ Planned Date &amp; Time</Text>
              <Text style={styles.previewText}>{formattedDatePreview}</Text>
            </View>

            <View style={styles.navRow}>
              <Button title="← Edit Location" variant="ghost" onPress={() => setStep(2)} style={styles.flexBtn} />
              <Button
                title="Publish Run 🚀"
                onPress={handleSubmit(onSubmit, onFormError)}
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
  activityBadgeContainer: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.border.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityBadgeIcon: {
    fontSize: 20,
  },
  activityBadgeText: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
  },
  activityBadgeSubtitle: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
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
  navRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl },
  flexBtn: { flex: 1 },
  previewBox: {},
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  previewTitle: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  previewDistance: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  previewLabel: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  previewText: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
