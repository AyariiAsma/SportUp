export const TUNISIA_GOVERNORATES = [
  { label: 'Ariana', value: 'Ariana' },
  { label: 'Béja', value: 'Béja' },
  { label: 'Ben Arous', value: 'Ben Arous' },
  { label: 'Bizerte', value: 'Bizerte' },
  { label: 'Gabès', value: 'Gabès' },
  { label: 'Gafsa', value: 'Gafsa' },
  { label: 'Jendouba', value: 'Jendouba' },
  { label: 'Kairouan', value: 'Kairouan' },
  { label: 'Kasserine', value: 'Kasserine' },
  { label: 'Kebili', value: 'Kebili' },
  { label: 'Kef', value: 'Kef' },
  { label: 'Mahdia', value: 'Mahdia' },
  { label: 'Manouba', value: 'Manouba' },
  { label: 'Medenine', value: 'Medenine' },
  { label: 'Monastir', value: 'Monastir' },
  { label: 'Nabeul', value: 'Nabeul' },
  { label: 'Sfax', value: 'Sfax' },
  { label: 'Sidi Bouzid', value: 'Sidi Bouzid' },
  { label: 'Siliana', value: 'Siliana' },
  { label: 'Sousse', value: 'Sousse' },
  { label: 'Tataouine', value: 'Tataouine' },
  { label: 'Tozeur', value: 'Tozeur' },
  { label: 'Tunis', value: 'Tunis' },
  { label: 'Zaghouan', value: 'Zaghouan' },
];

export const getVillesForGovernorate = (gov: string) => {
  // Simple mapping for major governorates to demonstrate the cascaded select
  const villes: Record<string, { label: string; value: string }[]> = {
    'Tunis': [
      { label: 'Carthage', value: 'Carthage' },
      { label: 'La Marsa', value: 'La Marsa' },
      { label: 'Le Bardo', value: 'Le Bardo' },
      { label: 'El Kram', value: 'El Kram' },
      { label: 'Sidi Bou Said', value: 'Sidi Bou Said' },
      { label: 'Centre Ville', value: 'Centre Ville' },
      { label: 'Lac 1', value: 'Lac 1' },
      { label: 'Lac 2', value: 'Lac 2' },
    ],
    'Ariana': [
      { label: 'Ariana Ville', value: 'Ariana Ville' },
      { label: 'Soukra', value: 'Soukra' },
      { label: 'Raoued', value: 'Raoued' },
      { label: 'Ghazela', value: 'Ghazela' },
    ],
    'Sousse': [
      { label: 'Sousse Ville', value: 'Sousse Ville' },
      { label: 'Hammam Sousse', value: 'Hammam Sousse' },
      { label: 'Kantaoui', value: 'Kantaoui' },
      { label: 'Akouda', value: 'Akouda' },
    ],
    'Sfax': [
      { label: 'Sfax Ville', value: 'Sfax Ville' },
      { label: 'Sakiet Ezzit', value: 'Sakiet Ezzit' },
      { label: 'Sakiet Eddaier', value: 'Sakiet Eddaier' },
    ]
  };

  return villes[gov] || [
    { label: `${gov} Centre`, value: `${gov} Centre` },
    { label: 'Other', value: 'Other' }
  ];
};
