import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import tunisiaData from '../../utils/data/tunisia.json';
import { Select } from './Select';

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
