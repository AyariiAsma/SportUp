import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import tunisiaData from '../../utils/data/tunisia.json';

interface AddressSelectorProps {
  initialRegion?: string;
  initialCity?: string;
  initialLocality?: string;
  onChange: (region: string, city: string, locality: string) => void;
}

export function AddressSelector({
  initialRegion = '',
  initialCity = '',
  initialLocality = '',
  onChange,
}: AddressSelectorProps) {
  const [region, setRegion] = useState(initialRegion);
  const [city, setCity] = useState(initialCity);
  const [locality, setLocality] = useState(initialLocality);

  const governorates = tunisiaData.governorates;
  
  const selectedGov = governorates.find((g) => g.name === region);
  const villes = selectedGov ? selectedGov.villes : [];
  
  const selectedVille = villes.find((v) => v.name === city);
  const localities = selectedVille ? selectedVille.localities : [];

  useEffect(() => {
    onChange(region, city, locality);
  }, [region, city, locality]);

  const handleRegionSelect = (govName: string) => {
    setRegion(govName);
    setCity('');
    setLocality('');
  };

  const handleCitySelect = (cityName: string) => {
    setCity(cityName);
    setLocality('');
  };

  const handleLocalitySelect = (locName: string) => {
    setLocality(locName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Governorate</Text>
      <View style={styles.optionsContainer}>
        {governorates.map((gov) => (
          <TouchableOpacity
            key={gov.name}
            style={[styles.optionBadge, region === gov.name && styles.optionBadgeActive]}
            onPress={() => handleRegionSelect(gov.name)}
          >
            <Text style={[styles.optionText, region === gov.name && styles.optionTextActive]}>
              {gov.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {villes.length > 0 && (
        <>
          <Text style={styles.label}>City (Ville)</Text>
          <View style={styles.optionsContainer}>
            {villes.map((v) => (
              <TouchableOpacity
                key={v.name}
                style={[styles.optionBadge, city === v.name && styles.optionBadgeActive]}
                onPress={() => handleCitySelect(v.name)}
              >
                <Text style={[styles.optionText, city === v.name && styles.optionTextActive]}>
                  {v.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {localities.length > 0 && (
        <>
          <Text style={styles.label}>Locality</Text>
          <View style={styles.optionsContainer}>
            {localities.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.optionBadge, locality === loc && styles.optionBadgeActive]}
                onPress={() => handleLocalitySelect(loc)}
              >
                <Text style={[styles.optionText, locality === loc && styles.optionTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.round,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBadgeActive: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderColor: theme.colors.primary,
  },
  optionText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
});
