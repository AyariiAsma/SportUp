export const theme = {
  colors: {
    // Brand
    primary: '#FF6B35', // Vibrant coral/orange
    secondary: '#2AB7CA', // Bright teal
    tertiary: '#FED766', // Sunny yellow

    // Backgrounds (Dark theme by default)
    background: '#0D1B2A', // Deep navy
    surface: '#1B263B',
    surfaceElevated: '#415A77',
    
    // Text
    text: '#FFFFFF',
    textSecondary: '#E0E1DD',
    textMuted: '#778DA9',

    // Status
    success: '#2ECC71',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#3498DB',

    // Sport-specific accents
    sport: {
      running: '#FF6B35',
      walking: '#4ECDC4',
      cycling: '#45B7D1',
      hiking: '#96CEB4',
      football: '#2ECC71',
      basketball: '#E67E22',
      fitness: '#9B59B6',
      yoga: '#F39C12',
      swimming: '#3498DB',
      tennis: '#1ABC9C',
      groupWorkout: '#E74C3C',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  border: {
    radius: {
      sm: 4,
      md: 8,
      lg: 16,
      xl: 24,
      round: 9999,
    },
    width: {
      thin: 1,
      thick: 2,
    }
  },
  typography: {
    fontFamily: {
      primary: 'Inter',
      heading: 'Outfit',
      regular: 'Inter',
      medium: 'Inter',
      semiBold: 'Inter',
      bold: 'Outfit',
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
      xxxl: 40,
    },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
    }
  }
};
