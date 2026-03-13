// Widget Data Provider - Syncs data between app and widgets
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const APP_GROUP = 'group.com.m888ai.lifecountdown';

// Conditional import for iOS widget support
let WidgetKit: any = null;
if (Platform.OS === 'ios') {
  try {
    WidgetKit = require('react-native-widgetkit');
  } catch (e) {
    console.log('WidgetKit not available');
  }
}

export interface WidgetData {
  birthDate: string;
  lifeExpectancy: number;
  daysLeft: number;
  weeksLeft: number;
  yearsLeft: number;
  percentLived: number;
  lastUpdated: string;
}

export async function syncWidgetData(): Promise<void> {
  if (Platform.OS !== 'ios' || !WidgetKit) return;
  
  try {
    const data = await AsyncStorage.getItem('lifeCountdown');
    if (!data) return;

    const parsed = JSON.parse(data);
    const birthDate = new Date(parsed.birthDate);
    const lifeExpectancy = parsed.lifeExpectancy;

    // Calculate stats
    const now = new Date();
    const deathDate = new Date(birthDate);
    deathDate.setFullYear(deathDate.getFullYear() + lifeExpectancy);

    const msLeft = deathDate.getTime() - now.getTime();
    const msLived = now.getTime() - birthDate.getTime();
    const totalMs = deathDate.getTime() - birthDate.getTime();

    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const weeksLeft = Math.floor(daysLeft / 7);
    const yearsLeft = Math.floor(daysLeft / 365.25);
    const percentLived = Math.min(100, (msLived / totalMs) * 100);

    const widgetData: WidgetData = {
      birthDate: parsed.birthDate,
      lifeExpectancy,
      daysLeft,
      weeksLeft,
      yearsLeft,
      percentLived,
      lastUpdated: new Date().toISOString(),
    };

    // Sync to iOS widget via App Group
    if (WidgetKit.setItem) {
      await WidgetKit.setItem('widgetData', widgetData, APP_GROUP);
    }
    
    // Trigger widget reload
    if (WidgetKit.reloadAllTimelines) {
      await WidgetKit.reloadAllTimelines();
    }
  } catch (error) {
    console.error('Failed to sync widget data:', error);
  }
}

export async function getWidgetData(): Promise<WidgetData | null> {
  if (Platform.OS !== 'ios' || !WidgetKit) return null;
  
  try {
    if (WidgetKit.getItem) {
      const data = await WidgetKit.getItem('widgetData', APP_GROUP);
      return data as WidgetData;
    }
    return null;
  } catch (error) {
    console.error('Failed to get widget data:', error);
    return null;
  }
}
