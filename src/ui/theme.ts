import { Color } from '../engine/board';

export const PALETTE: Record<Color, { main: string; light: string; dark: string }> = {
  red: { main: '#E53935', light: '#FFCDD2', dark: '#B71C1C' },
  green: { main: '#43A047', light: '#C8E6C9', dark: '#1B5E20' },
  yellow: { main: '#F9C80E', light: '#FFF3C4', dark: '#C49000' },
  blue: { main: '#1E88E5', light: '#BBDEFB', dark: '#0D47A1' },
};

export const UI = {
  bg: '#0F1B2D',
  surface: '#1B2A41',
  text: '#F5F7FA',
  muted: '#9AA8BC',
  boardLine: '#2B2B2B',
  accent: '#FFB300',
};

export const LABEL: Record<Color, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };
