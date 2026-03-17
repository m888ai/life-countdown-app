import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Share,
  Dimensions,
  Switch,
  Modal,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
// Widget support - to be added with native build
const WidgetKit: any = null;

const { width } = Dimensions.get('window');
const APP_GROUP = 'group.com.evcengage.lifecountdown';

// Historical figures for comparison
const HISTORICAL_FIGURES = [
  { name: 'Mozart', livedYears: 35, emoji: '🎼', quote: 'Composed 600+ works' },
  { name: 'Alexander the Great', livedYears: 32, emoji: '⚔️', quote: 'Conquered the known world' },
  { name: 'Martin Luther King Jr.', livedYears: 39, emoji: '✊', quote: 'Led the civil rights movement' },
  { name: 'Bruce Lee', livedYears: 32, emoji: '🥋', quote: 'Revolutionized martial arts' },
  { name: 'Anne Frank', livedYears: 15, emoji: '📔', quote: 'Inspired millions through her diary' },
  { name: 'Jimi Hendrix', livedYears: 27, emoji: '🎸', quote: 'Greatest guitarist ever' },
  { name: 'Frida Kahlo', livedYears: 47, emoji: '🎨', quote: '200+ paintings that changed art' },
  { name: 'Steve Jobs', livedYears: 56, emoji: '🍎', quote: 'Created Apple, Pixar, changed tech' },
  { name: 'Kobe Bryant', livedYears: 41, emoji: '🏀', quote: '5 NBA championships, legend' },
];

// Configure notifications (SDK 54 format)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

interface LifeStats {
  yearsLeft: number;
  monthsLeft: number;
  weeksLeft: number;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  percentLived: number;
  totalWeeks: number;
  weeksLived: number;
  // Extended stats
  heartbeatsLeft: number;
  breathsLeft: number;
  sunrisesLeft: number;
  sleepsLeft: number;
  mealsLeft: number;
  summersLeft: number;
  christmasesLeft: number;
  fullMoonsLeft: number;
}

interface Milestone {
  id: string;
  title: string;
  date: Date;
  emoji: string;
}

type VisualizationMode = 'grid' | 'calendar' | 'spiral' | 'blocks';

// Memoized week dot to prevent re-renders
const WeekDot = memo(({ lived }: { lived: boolean }) => (
  <View style={[styles.weekDot, lived ? styles.weekDotLived : styles.weekDotRemaining]} />
));

// Memoized grid visualization
const WeeksGrid = memo(({ totalWeeks, weeksLived }: { totalWeeks: number; weeksLived: number }) => (
  <View style={styles.weeksGrid}>
    {Array.from({ length: Math.min(totalWeeks, 4160) }, (_, i) => (
      <WeekDot key={i} lived={i < weeksLived} />
    ))}
  </View>
));

// Centralized save function to prevent race conditions
const saveData = async (data: {
  birthDate: string | undefined;
  lifeExpectancy: number;
  dailyReminders: boolean;
  milestones: Milestone[];
}) => {
  try {
    await AsyncStorage.setItem('lifeCountdown', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
};

export default function App() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(80);
  const [showSetup, setShowSetup] = useState(true);
  const [stats, setStats] = useState<LifeStats | null>(null);
  const [lastSyncedDay, setLastSyncedDay] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<'countdown' | 'stats' | 'milestones' | 'settings'>('countdown');
  const [dailyReminders, setDailyReminders] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('grid');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneEmoji, setNewMilestoneEmoji] = useState('🎯');
  const [newMilestoneMonth, setNewMilestoneMonth] = useState('');
  const [newMilestoneDay, setNewMilestoneDay] = useState('');
  const [newMilestoneYear, setNewMilestoneYear] = useState('');
  const [setupError, setSetupError] = useState('');

  // Setup form state
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [expectancy, setExpectancy] = useState('80');

  const quotes = [
    "The fear of death follows from the fear of life. Live fully.",
    "Memento mori — remember that you will die.",
    "Your time is limited. Don't waste it living someone else's life.",
    "It is not death that a man should fear, but never beginning to live.",
    "The trouble is, you think you have time.",
    "Every man dies. Not every man really lives.",
    "Life is short. Eat dessert first.",
    "You could leave life right now. Let that determine what you do and say.",
    "The only way to do great work is to love what you do.",
    "In the end, it's not the years in your life that count. It's the life in your years.",
  ];

  const [currentQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (birthDate) {
      calculateStats();
      const interval = setInterval(calculateStats, 1000);
      return () => clearInterval(interval);
    }
  }, [birthDate, lifeExpectancy]);

  // Sync data to widgets
  const syncWidgetData = async (calculatedStats: LifeStats) => {
    if (Platform.OS !== 'ios' || !WidgetKit) return;

    try {
      const widgetData = {
        birthDate: birthDate?.toISOString() || '',
        lifeExpectancy,
        daysLeft: calculatedStats.daysLeft,
        weeksLeft: calculatedStats.weeksLeft,
        yearsLeft: calculatedStats.yearsLeft,
        percentLived: calculatedStats.percentLived,
        lastUpdated: new Date().toISOString(),
      };

      if (WidgetKit.setItem) {
        await WidgetKit.setItem('widgetData', JSON.stringify(widgetData), APP_GROUP);
      }
      if (WidgetKit.reloadAllTimelines) {
        await WidgetKit.reloadAllTimelines();
      }
    } catch (error) {
      console.log('Widget sync skipped:', error);
    }
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const scheduleDailyReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (dailyReminders && stats) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Memento Mori',
          body: `You have ${stats.daysLeft.toLocaleString()} days left. Make today count.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
        },
      });
    }
  };

  useEffect(() => {
    if (dailyReminders) {
      scheduleDailyReminder();
    }
  }, [dailyReminders]);

  // Re-schedule when stats change but only if reminders are on and day actually changed
  useEffect(() => {
    if (dailyReminders && stats) {
      scheduleDailyReminder();
    }
  }, [stats?.daysLeft]);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('lifeCountdown');
      if (data) {
        const parsed = JSON.parse(data);
        const loadedDate = new Date(parsed.birthDate);
        // Validate loaded date
        if (isNaN(loadedDate.getTime())) {
          console.log('Invalid saved birth date, showing setup');
          return;
        }
        setBirthDate(loadedDate);
        setLifeExpectancy(parsed.lifeExpectancy || 80);
        setDailyReminders(parsed.dailyReminders || false);
        setMilestones(parsed.milestones || []);
        // Pre-fill setup form with saved values
        setBirthMonth(String(loadedDate.getMonth() + 1));
        setBirthDay(String(loadedDate.getDate()));
        setBirthYear(String(loadedDate.getFullYear()));
        setExpectancy(String(parsed.lifeExpectancy || 80));
        setShowSetup(false);
      }
    } catch (e) {
      console.log('No saved data');
    }
  };

  const validateAndSave = (): boolean => {
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);
    const year = parseInt(birthYear);
    const exp = parseInt(expectancy);

    if (!birthMonth || !birthDay || !birthYear || !expectancy) {
      setSetupError('Please fill in all fields');
      return false;
    }

    if (isNaN(month) || month < 1 || month > 12) {
      setSetupError('Month must be 1-12');
      return false;
    }

    if (isNaN(day) || day < 1 || day > 31) {
      setSetupError('Day must be 1-31');
      return false;
    }

    if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      setSetupError('Enter a valid birth year');
      return false;
    }

    if (isNaN(exp) || exp < 1 || exp > 150) {
      setSetupError('Life expectancy must be 1-150');
      return false;
    }

    const date = new Date(year, month - 1, day);
    // Check for date rollover (e.g., Feb 31 -> Mar 3)
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      setSetupError('Invalid date for this month');
      return false;
    }

    if (date >= new Date()) {
      setSetupError('Birth date must be in the past');
      return false;
    }

    return true;
  };

  const saveUserData = async () => {
    if (!validateAndSave()) return;

    const date = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    const exp = parseInt(expectancy);

    await saveData({
      birthDate: date.toISOString(),
      lifeExpectancy: exp,
      dailyReminders,
      milestones
    });

    setBirthDate(date);
    setLifeExpectancy(exp);
    setSetupError('');
    setShowSetup(false);
  };

  const calculateStats = () => {
    if (!birthDate) return;

    const now = new Date();
    const deathDate = new Date(birthDate);
    deathDate.setFullYear(deathDate.getFullYear() + lifeExpectancy);

    const msLeft = deathDate.getTime() - now.getTime();
    const msLived = now.getTime() - birthDate.getTime();
    const totalMs = deathDate.getTime() - birthDate.getTime();

    if (totalMs <= 0) return;

    const secondsLeft = Math.max(0, Math.floor(msLeft / 1000));
    const minutesLeft = Math.floor(secondsLeft / 60);
    const hoursLeft = Math.floor(minutesLeft / 60);
    const daysLeft = Math.floor(hoursLeft / 24);
    const weeksLeft = Math.floor(daysLeft / 7);
    const monthsLeft = Math.floor(daysLeft / 30.44);
    const yearsLeft = Math.floor(daysLeft / 365.25);

    const totalWeeks = Math.floor(lifeExpectancy * 52.18);
    const weeksLived = Math.floor(msLived / (1000 * 60 * 60 * 24 * 7));
    const percentLived = Math.min(100, Math.max(0, (msLived / totalMs) * 100));

    // Fun stats
    const heartbeatsLeft = Math.floor(daysLeft * 100000);
    const breathsLeft = Math.floor(daysLeft * 20000);
    const sunrisesLeft = daysLeft;
    const sleepsLeft = daysLeft;
    const mealsLeft = daysLeft * 3;
    const summersLeft = yearsLeft;
    const christmasesLeft = yearsLeft;
    const fullMoonsLeft = Math.floor(monthsLeft);

    const newStats = {
      yearsLeft,
      monthsLeft,
      weeksLeft,
      daysLeft,
      hoursLeft,
      minutesLeft,
      secondsLeft,
      percentLived,
      totalWeeks,
      weeksLived,
      heartbeatsLeft,
      breathsLeft,
      sunrisesLeft,
      sleepsLeft,
      mealsLeft,
      summersLeft,
      christmasesLeft,
      fullMoonsLeft,
    };

    setStats(newStats);

    // Sync to widgets when days change
    if (daysLeft !== lastSyncedDay) {
      setLastSyncedDay(daysLeft);
      syncWidgetData(newStats);
    }
  };

  const shareStats = async () => {
    if (!stats) return;

    try {
      await Share.share({
        message: `Your Countdown\n\nI have approximately:\n- ${stats.yearsLeft} years\n- ${stats.daysLeft.toLocaleString()} days\n- ${stats.sunrisesLeft.toLocaleString()} sunrises\n\n${stats.percentLived.toFixed(1)}% of my life has passed.\n\nRemember: Memento Mori`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addMilestone = async (title: string, date: Date, emoji: string) => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title,
      date,
      emoji
    };
    const updated = [...milestones, newMilestone];
    setMilestones(updated);
    await saveData({
      birthDate: birthDate?.toISOString(),
      lifeExpectancy,
      dailyReminders,
      milestones: updated
    });
  };

  const deleteMilestone = async (milestoneId: string) => {
    const updated = milestones.filter(m => m.id !== milestoneId);
    setMilestones(updated);
    await saveData({
      birthDate: birthDate?.toISOString(),
      lifeExpectancy,
      dailyReminders,
      milestones: updated
    });
  };

  const getMilestoneDaysLeft = (date: Date) => {
    const now = new Date();
    const ms = date.getTime() - now.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive daily reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setDailyReminders(value);
    await saveData({
      birthDate: birthDate?.toISOString(),
      lifeExpectancy,
      dailyReminders: value,
      milestones
    });
  };

  // Memoize age calculation for historical figures
  const yourAge = useMemo(() => {
    if (!birthDate) return 0;
    return Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [birthDate, stats?.daysLeft]);

  // Setup Screen
  if (showSetup) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.setupContainer}>
          <Text style={styles.setupEmoji} accessibilityLabel="Skull emoji">💀</Text>
          <Text style={styles.setupTitle}>Memento Mori</Text>
          <Text style={styles.setupTagline}>Remember that you will die.</Text>

          <Text style={styles.setupSubtitle}>When were you born?</Text>

          <View style={styles.dateInputRow}>
            <TextInput
              style={styles.dateInput}
              value={birthMonth}
              onChangeText={(t) => { setBirthMonth(t); setSetupError(''); }}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor="#666"
              maxLength={2}
              accessibilityLabel="Birth month"
              returnKeyType="next"
            />
            <Text style={styles.dateSeparator}>/</Text>
            <TextInput
              style={styles.dateInput}
              value={birthDay}
              onChangeText={(t) => { setBirthDay(t); setSetupError(''); }}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor="#666"
              maxLength={2}
              accessibilityLabel="Birth day"
              returnKeyType="next"
            />
            <Text style={styles.dateSeparator}>/</Text>
            <TextInput
              style={[styles.dateInput, { width: 100 }]}
              value={birthYear}
              onChangeText={(t) => { setBirthYear(t); setSetupError(''); }}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor="#666"
              maxLength={4}
              accessibilityLabel="Birth year"
              returnKeyType="next"
            />
          </View>

          <Text style={styles.setupSubtitle}>Life expectancy</Text>
          <View style={styles.expectancyRow}>
            <TextInput
              style={styles.expectancyInput}
              value={expectancy}
              onChangeText={(t) => { setExpectancy(t); setSetupError(''); }}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Life expectancy in years"
              returnKeyType="done"
            />
            <Text style={styles.expectancyLabel}>years</Text>
          </View>

          {setupError ? (
            <Text style={styles.setupError}>{setupError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.startButton}
            onPress={saveUserData}
            accessibilityRole="button"
            accessibilityLabel="Begin using the app"
          >
            <Text style={styles.startButtonText}>Face Your Mortality</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
      </TouchableWithoutFeedback>
    );
  }

  // Main App
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tab Bar */}
      <SafeAreaView edges={['top']} style={styles.tabBarSafeArea}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'countdown' && styles.activeTab]}
            onPress={() => setActiveTab('countdown')}
            accessibilityRole="tab"
            accessibilityLabel="Countdown"
            accessibilityState={{ selected: activeTab === 'countdown' }}
          >
            <Text style={styles.tabText}>⏳</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
            accessibilityRole="tab"
            accessibilityLabel="Statistics"
            accessibilityState={{ selected: activeTab === 'stats' }}
          >
            <Text style={styles.tabText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'milestones' && styles.activeTab]}
            onPress={() => setActiveTab('milestones')}
            accessibilityRole="tab"
            accessibilityLabel="Milestones"
            accessibilityState={{ selected: activeTab === 'milestones' }}
          >
            <Text style={styles.tabText}>🎯</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
            accessibilityRole="tab"
            accessibilityLabel="Settings"
            accessibilityState={{ selected: activeTab === 'settings' }}
          >
            <Text style={styles.tabText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* COUNTDOWN TAB */}
        {activeTab === 'countdown' && stats && (
          <>
            <View style={styles.header}>
              <Text style={styles.quote}>"{currentQuote}"</Text>
            </View>

            {/* Dramatic Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerNumber} accessibilityLabel={`${Math.floor(stats.hoursLeft % 24)} hours ${Math.floor(stats.minutesLeft % 60)} minutes ${Math.floor(stats.secondsLeft % 60)} seconds remaining`}>
                {String(Math.floor(stats.hoursLeft % 24)).padStart(2, '0')}:
                {String(Math.floor(stats.minutesLeft % 60)).padStart(2, '0')}:
                {String(Math.floor(stats.secondsLeft % 60)).padStart(2, '0')}
              </Text>
              <Text style={styles.timerLabel}>hours : mins : secs remaining</Text>
            </View>

            {/* Big Number - Days */}
            <View style={styles.bigStatContainer}>
              <Text style={styles.bigNumber} accessibilityLabel={`${stats.daysLeft.toLocaleString()} days remaining`}>
                {stats.daysLeft.toLocaleString()}
              </Text>
              <Text style={styles.bigLabel}>days remaining</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(stats.percentLived) }}>
                <View style={[styles.progressFill, { width: `${stats.percentLived}%` }]} />
              </View>
              <Text style={styles.progressText}>{stats.percentLived.toFixed(2)}% complete</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.yearsLeft}</Text>
                <Text style={styles.statLabel}>years</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.monthsLeft}</Text>
                <Text style={styles.statLabel}>months</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.weeksLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>weeks</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.hoursLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>hours</Text>
              </View>
            </View>

            {/* Visualization Mode Selector */}
            <View style={styles.vizModeSelector} accessibilityRole="tablist">
              {(['grid', 'calendar', 'spiral', 'blocks'] as VisualizationMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.vizModeButton, visualizationMode === mode && styles.vizModeActive]}
                  onPress={() => setVisualizationMode(mode)}
                  accessibilityRole="tab"
                  accessibilityLabel={mode === 'grid' ? 'Grid view' : mode === 'calendar' ? 'Calendar view' : mode === 'spiral' ? 'Spiral view' : 'Blocks view'}
                  accessibilityState={{ selected: visualizationMode === mode }}
                >
                  <Text style={[styles.vizModeText, visualizationMode === mode && styles.vizModeTextActive]}>
                    {mode === 'grid' ? '⊡' : mode === 'calendar' ? '📅' : mode === 'spiral' ? '🌀' : '▦'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Life Visualization */}
            <View style={styles.weeksSection}>
              <Text style={styles.weeksTitle}>
                {visualizationMode === 'grid' && 'Your Life in Weeks'}
                {visualizationMode === 'calendar' && 'Your Life in Years'}
                {visualizationMode === 'spiral' && 'Life Spiral'}
                {visualizationMode === 'blocks' && 'Life Blocks (Decades)'}
              </Text>
              <Text style={styles.weeksSubtitle}>
                {visualizationMode === 'grid' && `Each dot = 1 week  |  ${stats.weeksLived} lived  |  ${stats.weeksLeft} left`}
                {visualizationMode === 'calendar' && `Each row = 1 year  |  52 weeks per row`}
                {visualizationMode === 'spiral' && `Spiraling through time  |  ${stats.percentLived.toFixed(1)}% complete`}
                {visualizationMode === 'blocks' && `Each block = 10 years  |  ${Math.ceil(lifeExpectancy / 10)} decades total`}
              </Text>

              {/* Grid View - Memoized */}
              {visualizationMode === 'grid' && (
                <WeeksGrid totalWeeks={stats.totalWeeks} weeksLived={stats.weeksLived} />
              )}

              {/* Calendar View - Years as rows */}
              {visualizationMode === 'calendar' && (
                <View style={styles.calendarGrid}>
                  {Array.from({ length: lifeExpectancy }, (_, yearIdx) => {
                    const yearStart = yearIdx * 52;
                    const weeksInYear = Array.from({ length: 52 }, (_, weekIdx) => yearStart + weekIdx);
                    return (
                      <View key={yearIdx} style={styles.calendarRow}>
                        <Text style={styles.calendarYear}>{yearIdx + 1}</Text>
                        <View style={styles.calendarWeeks}>
                          {weeksInYear.map((weekNum) => (
                            <View
                              key={weekNum}
                              style={[
                                styles.calendarDot,
                                weekNum < stats.weeksLived ? styles.weekDotLived : styles.weekDotRemaining
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Spiral View */}
              {visualizationMode === 'spiral' && (
                <View style={styles.spiralContainer}>
                  {Array.from({ length: Math.min(lifeExpectancy, 90) }, (_, i) => {
                    const angle = i * 15 * (Math.PI / 180);
                    const radius = 20 + i * 1.5;
                    const centerX = 150;
                    const centerY = 150;
                    const x = Math.cos(angle) * radius + centerX;
                    const y = Math.sin(angle) * radius + centerY;

                    return (
                      <View
                        key={i}
                        style={[
                          styles.spiralDot,
                          { left: x, top: y },
                          i < yourAge ? styles.weekDotLived : styles.weekDotRemaining
                        ]}
                      />
                    );
                  })}
                </View>
              )}

              {/* Blocks View - Decades */}
              {visualizationMode === 'blocks' && (
                <View style={styles.blocksGrid}>
                  {Array.from({ length: Math.ceil(lifeExpectancy / 10) }, (_, decadeIdx) => {
                    const decadeStart = decadeIdx * 10;
                    const decadeEnd = Math.min((decadeIdx + 1) * 10, lifeExpectancy);
                    const percentFilled = Math.max(0, Math.min(100, ((yourAge - decadeStart) / (decadeEnd - decadeStart)) * 100));
                    const isPast = yourAge >= decadeEnd;
                    const isCurrent = yourAge >= decadeStart && yourAge < decadeEnd;

                    return (
                      <View key={decadeIdx} style={styles.decadeBlock}>
                        <View style={[
                          styles.decadeBlockInner,
                          isPast && styles.decadeBlockPast,
                          isCurrent && styles.decadeBlockCurrent
                        ]}>
                          {isCurrent && (
                            <View style={[styles.decadeProgress, { height: `${percentFilled}%` }]} />
                          )}
                        </View>
                        <Text style={styles.decadeLabel}>{decadeStart}-{decadeEnd}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareStats}
              accessibilityRole="button"
              accessibilityLabel="Share my life stats"
            >
              <Text style={styles.shareButtonText}>Share My Stats</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && stats && (
          <>
            <Text style={styles.sectionTitle}>Life in Numbers</Text>

            <View style={styles.funStatsGrid}>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>🌅</Text>
                <Text style={styles.funStatNumber}>{stats.sunrisesLeft.toLocaleString()}</Text>
                <Text style={styles.funStatLabel}>sunrises left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>😴</Text>
                <Text style={styles.funStatNumber}>{stats.sleepsLeft.toLocaleString()}</Text>
                <Text style={styles.funStatLabel}>sleeps left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>🍽️</Text>
                <Text style={styles.funStatNumber}>{stats.mealsLeft.toLocaleString()}</Text>
                <Text style={styles.funStatLabel}>meals left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>☀️</Text>
                <Text style={styles.funStatNumber}>{stats.summersLeft}</Text>
                <Text style={styles.funStatLabel}>summers left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>🎄</Text>
                <Text style={styles.funStatNumber}>{stats.christmasesLeft}</Text>
                <Text style={styles.funStatLabel}>Christmases left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>🌕</Text>
                <Text style={styles.funStatNumber}>{stats.fullMoonsLeft}</Text>
                <Text style={styles.funStatLabel}>full moons left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>💓</Text>
                <Text style={styles.funStatNumber}>{(stats.heartbeatsLeft / 1000000000).toFixed(1)}B</Text>
                <Text style={styles.funStatLabel}>heartbeats left</Text>
              </View>
              <View style={styles.funStatCard}>
                <Text style={styles.funStatEmoji}>🌬️</Text>
                <Text style={styles.funStatNumber}>{(stats.breathsLeft / 1000000).toFixed(0)}M</Text>
                <Text style={styles.funStatLabel}>breaths left</Text>
              </View>
            </View>

            <View style={styles.motivationSection}>
              <Text style={styles.motivationTitle}>Perspective</Text>
              <Text style={styles.motivationText}>
                You have {stats.summersLeft} summers left to feel the sun on your skin.{'\n\n'}
                {stats.christmasesLeft} more times to gather with loved ones.{'\n\n'}
                {stats.sunrisesLeft.toLocaleString()} more chances to wake up and choose how you spend your day.{'\n\n'}
                What will you do with them?
              </Text>
            </View>

            {/* Compare with Historical Figures */}
            <Text style={styles.sectionTitle}>They Changed the World</Text>
            <Text style={styles.sectionSubtitle}>
              {birthDate && `You've lived ${yourAge} years. Look what they accomplished:`}
            </Text>

            {HISTORICAL_FIGURES.map((figure, idx) => {
              const comparison = yourAge >= figure.livedYears ? 'outlived' : 'younger';
              const diff = Math.abs(yourAge - figure.livedYears);

              return (
                <View key={idx} style={styles.figureCard} accessibilityLabel={`${figure.name}, lived ${figure.livedYears} years. ${figure.quote}. You ${comparison === 'outlived' ? 'outlived them by' : 'are'} ${diff} years ${comparison === 'outlived' ? '' : 'younger'}`}>
                  <Text style={styles.figureEmoji}>{figure.emoji}</Text>
                  <View style={styles.figureInfo}>
                    <Text style={styles.figureName}>{figure.name}</Text>
                    <Text style={styles.figureYears}>Lived {figure.livedYears} years</Text>
                    <Text style={styles.figureQuote}>{figure.quote}</Text>
                  </View>
                  <View style={styles.figureComparison}>
                    {comparison === 'outlived' ? (
                      <Text style={styles.figureOutlived}>+{diff}y</Text>
                    ) : (
                      <Text style={styles.figureYounger}>-{diff}y</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* MILESTONES TAB */}
        {activeTab === 'milestones' && (
          <>
            <Text style={styles.sectionTitle}>Countdown To...</Text>

            {/* Default Milestones */}
            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneEmoji}>🎂</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Next Birthday</Text>
                <Text style={styles.milestoneDays}>
                  {birthDate && getMilestoneDaysLeft(new Date(new Date().getFullYear() + (new Date() > new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0), birthDate.getMonth(), birthDate.getDate()))} days
                </Text>
              </View>
            </View>

            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneEmoji}>🎆</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>New Year {new Date().getFullYear() + 1}</Text>
                <Text style={styles.milestoneDays}>
                  {getMilestoneDaysLeft(new Date(new Date().getFullYear() + 1, 0, 1))} days
                </Text>
              </View>
            </View>

            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneEmoji}>🎄</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Christmas</Text>
                <Text style={styles.milestoneDays}>
                  {getMilestoneDaysLeft(new Date(new Date().getFullYear() + (new Date() > new Date(new Date().getFullYear(), 11, 25) ? 1 : 0), 11, 25))} days
                </Text>
              </View>
            </View>

            {/* Custom Milestones */}
            {milestones.map((m) => (
              <View key={m.id} style={styles.milestoneCard}>
                <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  <Text style={styles.milestoneDays}>
                    {getMilestoneDaysLeft(new Date(m.date))} days
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.milestoneDeleteButton}
                  onPress={() => deleteMilestone(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${m.title} milestone`}
                >
                  <Text style={styles.milestoneDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addMilestoneButton}
              onPress={() => {
                setNewMilestoneYear(String(new Date().getFullYear() + 1));
                setNewMilestoneMonth('1');
                setNewMilestoneDay('1');
                setShowMilestoneModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add custom milestone"
            >
              <Text style={styles.addMilestoneText}>+ Add Custom Milestone</Text>
            </TouchableOpacity>

            {milestones.length > 0 && (
              <Text style={styles.deleteHint}>Tap ✕ to remove custom milestones</Text>
            )}
          </>
        )}

        {/* Add Milestone Modal */}
        <Modal
          visible={showMilestoneModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMilestoneModal(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Milestone</Text>

              {/* Emoji Picker */}
              <Text style={styles.modalLabel}>Pick an emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiPicker}>
                {['🎯', '🏖️', '💍', '🎓', '🏠', '👶', '✈️', '🚀', '💰', '🎉', '🏆', '❤️', '🌟', '📚', '🎸'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiOption, newMilestoneEmoji === emoji && styles.emojiSelected]}
                    onPress={() => setNewMilestoneEmoji(emoji)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${emoji} emoji`}
                    accessibilityState={{ selected: newMilestoneEmoji === emoji }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.modalLabel}>What's the milestone?</Text>
              <TextInput
                style={styles.modalInput}
                value={newMilestoneTitle}
                onChangeText={setNewMilestoneTitle}
                placeholder="e.g., Retirement, Wedding, Trip to Japan"
                placeholderTextColor="#666"
                accessibilityLabel="Milestone title"
              />

              {/* Date */}
              <Text style={styles.modalLabel}>When?</Text>
              <View style={styles.dateInputRow}>
                <TextInput
                  style={styles.dateInput}
                  value={newMilestoneMonth}
                  onChangeText={setNewMilestoneMonth}
                  keyboardType="number-pad"
                  placeholder="MM"
                  placeholderTextColor="#666"
                  maxLength={2}
                  accessibilityLabel="Milestone month"
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  style={styles.dateInput}
                  value={newMilestoneDay}
                  onChangeText={setNewMilestoneDay}
                  keyboardType="number-pad"
                  placeholder="DD"
                  placeholderTextColor="#666"
                  maxLength={2}
                  accessibilityLabel="Milestone day"
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  style={[styles.dateInput, { width: 100 }]}
                  value={newMilestoneYear}
                  onChangeText={setNewMilestoneYear}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor="#666"
                  maxLength={4}
                  accessibilityLabel="Milestone year"
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowMilestoneModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => {
                    if (newMilestoneTitle && newMilestoneYear && newMilestoneMonth && newMilestoneDay) {
                      const month = parseInt(newMilestoneMonth);
                      const day = parseInt(newMilestoneDay);
                      const year = parseInt(newMilestoneYear);

                      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2024) {
                        Alert.alert('Invalid Date', 'Please enter a valid date.');
                        return;
                      }

                      const date = new Date(year, month - 1, day);
                      if (date.getMonth() !== month - 1 || date.getDate() !== day) {
                        Alert.alert('Invalid Date', 'This date does not exist.');
                        return;
                      }

                      if (date <= new Date()) {
                        Alert.alert('Invalid Date', 'Milestone must be in the future.');
                        return;
                      }

                      addMilestone(newMilestoneTitle, date, newMilestoneEmoji);
                      setNewMilestoneTitle('');
                      setShowMilestoneModal(false);
                    } else {
                      Alert.alert('Missing Info', 'Please fill in all fields.');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add milestone"
                >
                  <Text style={styles.modalSaveText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Daily Reminder</Text>
                <Text style={styles.settingDescription}>Get reminded of your mortality at 8 AM</Text>
              </View>
              <Switch
                value={dailyReminders}
                onValueChange={handleDailyReminderToggle}
                trackColor={{ false: '#333', true: '#ff6b35' }}
                thumbColor="#fff"
                accessibilityLabel="Toggle daily reminder notifications"
              />
            </View>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setShowSetup(true)}
              accessibilityRole="button"
              accessibilityLabel="Change birth date or life expectancy"
            >
              <Text style={styles.settingButtonText}>Change Birth Date / Life Expectancy</Text>
            </TouchableOpacity>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutText}>
                "Memento Mori" is Latin for "remember that you will die."{'\n\n'}
                This ancient practice isn't meant to be morbid—it's meant to inspire you to live fully, love deeply, and make every moment count.{'\n\n'}
                Use this app as a daily reminder that your time is limited and precious.
              </Text>
            </View>

            <Text style={styles.versionText}>Your Countdown v1.0.0</Text>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabBarSafeArea: {
    backgroundColor: '#111',
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 10,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff6b35',
  },
  tabText: {
    fontSize: 24,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  setupEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  setupTagline: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 40,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
    marginTop: 25,
  },
  setupError: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 24,
    padding: 12,
    borderRadius: 10,
    width: 65,
    textAlign: 'center',
  },
  dateSeparator: {
    color: '#555',
    fontSize: 24,
    marginHorizontal: 8,
  },
  expectancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expectancyInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 32,
    padding: 15,
    borderRadius: 10,
    width: 80,
    textAlign: 'center',
  },
  expectancyLabel: {
    color: '#888',
    fontSize: 18,
    marginLeft: 10,
  },
  startButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 50,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  quote: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  timerNumber: {
    fontSize: 48,
    fontWeight: '200',
    color: '#ff6b35',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 12,
    color: '#888',
  },
  bigStatContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bigNumber: {
    fontSize: 80,
    fontWeight: '200',
    color: '#fff',
  },
  bigLabel: {
    fontSize: 16,
    color: '#999',
    marginTop: -5,
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginBottom: 25,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b35',
    borderRadius: 3,
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  statBox: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  weeksSection: {
    padding: 20,
    marginBottom: 20,
  },
  weeksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  weeksSubtitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
  },
  weeksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  weekDot: {
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  weekDotLived: {
    backgroundColor: '#ff6b35',
  },
  weekDotRemaining: {
    backgroundColor: '#444',
  },
  shareButton: {
    backgroundColor: '#222',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    padding: 20,
    paddingBottom: 15,
  },
  funStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  funStatCard: {
    width: '50%',
    padding: 10,
  },
  funStatEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  funStatNumber: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
  },
  funStatLabel: {
    fontSize: 12,
    color: '#888',
  },
  motivationSection: {
    padding: 20,
    backgroundColor: '#111',
    marginHorizontal: 15,
    borderRadius: 15,
    marginTop: 20,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  motivationText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 24,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 18,
    borderRadius: 12,
  },
  milestoneEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  milestoneDays: {
    fontSize: 14,
    color: '#ff6b35',
    marginTop: 4,
  },
  milestoneDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  milestoneDeleteText: {
    fontSize: 18,
    color: '#888',
  },
  addMilestoneButton: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addMilestoneText: {
    color: '#888',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151515',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 18,
    borderRadius: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  settingButton: {
    backgroundColor: '#222',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingButtonText: {
    color: '#ff6b35',
    fontSize: 16,
  },
  aboutSection: {
    padding: 20,
    marginTop: 30,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
  versionText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontSize: 16,
    padding: 14,
    borderRadius: 10,
  },
  emojiPicker: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  emojiOption: {
    padding: 10,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
  },
  emojiSelected: {
    backgroundColor: '#ff6b35',
  },
  emojiText: {
    fontSize: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteHint: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  // Historical Figures Styles
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 15,
  },
  figureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
  },
  figureEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  figureInfo: {
    flex: 1,
  },
  figureName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  figureYears: {
    fontSize: 12,
    color: '#999',
  },
  figureQuote: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  figureComparison: {
    paddingLeft: 10,
  },
  figureOutlived: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  figureYounger: {
    fontSize: 14,
    color: '#4a9eff',
    fontWeight: '600',
  },
  // Visualization Mode Styles
  vizModeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  vizModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vizModeActive: {
    backgroundColor: '#ff6b35',
  },
  vizModeText: {
    fontSize: 20,
    color: '#999',
  },
  vizModeTextActive: {
    color: '#fff',
  },
  // Calendar View Styles
  calendarGrid: {
    maxHeight: 400,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  calendarYear: {
    width: 24,
    fontSize: 8,
    color: '#888',
    textAlign: 'right',
    marginRight: 4,
  },
  calendarWeeks: {
    flexDirection: 'row',
    flex: 1,
  },
  calendarDot: {
    width: 4,
    height: 4,
    marginHorizontal: 0.5,
    borderRadius: 1,
  },
  // Spiral View Styles
  spiralContainer: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    position: 'relative',
  },
  spiralDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Blocks/Decades View Styles
  blocksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  decadeBlock: {
    alignItems: 'center',
  },
  decadeBlockInner: {
    width: 50,
    height: 80,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  decadeBlockPast: {
    backgroundColor: '#ff6b35',
  },
  decadeBlockCurrent: {
    backgroundColor: '#222',
  },
  decadeProgress: {
    width: '100%',
    backgroundColor: '#ff6b35',
  },
  decadeLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
});
