import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import tunisiaData from '../../utils/data/tunisia.json';
import { Select } from './Select';

interface AddressSelectorProps {
  region?: string;
  city?: string;
  locality?: string;
  initialRegion?: string;
  initialCity?: string;
  initialLocality?: string;
  onChange: (region: string, city: string, locality: string) => void;
}

export function AddressSelector({
  region = '',
  city = '',
  locality = '',
  onChange,
}: AddressSelectorProps) {
  const governorates = tunisiaData.governorates;
  
  const selectedGov = governorates.find((g) => g.name === region);
  const villes = selectedGov ? selectedGov.villes : [];
  
  const selectedVille = villes.find((v) => v.name === city);
  const localities = selectedVille ? selectedVille.localities : [];

  const handleRegionSelect = (govName: string) => {
    onChange(govName, '', '');
  };

  const handleCitySelect = (cityName: string) => {
    onChange(region, cityName, '');
  };

  const handleLocalitySelect = (locName: string) => {
    onChange(region, city, locName);
  };

  const govOptions = governorates.map((g) => ({ label: g.name, value: g.name }));
  const villeOptions = villes.map((v) => ({ label: v.name, value: v.name }));
  const localityOptions = localities.map((loc) => ({ label: loc, value: loc }));

  return (
    <View style={styles.container}>
      <Select
        label="Governorate"
        placeholder="Select Governorate..."
        selectedValue={region}
        onValueChange={handleRegionSelect}
        options={govOptions}
      />

      {villes.length > 0 && (
        <Select
          label="City / Delegation (Ville)"
          placeholder="Select City..."
          selectedValue={city}
          onValueChange={handleCitySelect}
          options={villeOptions}
        />
      )}

      {localities.length > 0 && (
        <Select
          label="Locality / Neighborhood"
          placeholder="Select Locality..."
          selectedValue={locality}
          onValueChange={handleLocalitySelect}
          options={localityOptions}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
});
