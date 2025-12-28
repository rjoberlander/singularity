/**
 * Material-UI Theme Configuration
 *
 * Syncs with Tailwind dark mode to ensure MUI components
 * respect the app's theme setting
 */

import { createTheme, Theme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark'): Theme => {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode colors
            primary: {
              main: '#3b82f6', // blue-500
            },
            secondary: {
              main: '#8b5cf6', // violet-500
            },
            background: {
              default: '#ffffff',
              paper: '#f9fafb', // gray-50
            },
            text: {
              primary: '#111827', // gray-900
              secondary: '#6b7280', // gray-500
            },
            divider: '#e5e7eb', // gray-200
          }
        : {
            // Dark mode colors - DARK backgrounds, BRIGHT text only
            primary: {
              main: '#60a5fa', // blue-400
            },
            secondary: {
              main: '#a78bfa', // violet-400
            },
            background: {
              default: '#0a0a0a', // very dark to match app
              paper: '#1a1a1a', // dark gray for modals
            },
            text: {
              primary: '#ffffff', // pure white for maximum readability
              secondary: '#ffffff', // white for labels too
            },
            divider: '#333333', // dark border
          }),
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'dark' ? '#6b7280 #1f2937' : '#d1d5db #ffffff',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: '8px',
              backgroundColor: mode === 'dark' ? '#6b7280' : '#d1d5db',
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff',
            },
          },
        },
      },
    },
  });
};
