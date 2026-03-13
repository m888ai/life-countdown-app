import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Share,
  Dimensions,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Configure notifications
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

export default function App() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(80);
  const [showSetup, setShowSetup] = useState(true);
  const [stats, setStats] = useState<LifeStats | null>(null);
  const [activeTab, setActiveTab] = useState<'countdown' | 'stats' | 'milestones' | 'settings'>('countdown');
  const [dailyReminders, setDailyReminders] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  // Setup form state
  const [birthYear, setBirthYear] = useState('1990');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthDay, setBirthDay] = useState('1');
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
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    if (birthDate) {
      calculateStats();
      const interval = setInterval(calculateStats, 1000);
      return () => clearInterval(interval);
    }
  }, [birthDate, lifeExpectancy]);

  const requestNotificationPermissions = async () => {
    await Notifications.requestPermissionsAsync();
  };

  const scheduleDailyReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    if (dailyReminders && stats) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏳ Memento Mori',
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
    scheduleDailyReminder();
  }, [dailyReminders, stats]);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('lifeCountdown');
      if (data) {
        const parsed = JSON.parse(data);
        setBirthDate(new Date(parsed.birthDate));
        setLifeExpectancy(parsed.lifeExpectancy);
        setDailyReminders(parsed.dailyReminders || false);
        setMilestones(parsed.milestones || []);
        setShowSetup(false);
      }
    } catch (e) {
      console.log('No saved data');
    }
  };

  const saveUserData = async () => {
    const date = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    const exp = parseInt(expectancy);
    
    await AsyncStorage.setItem('lifeCountdown', JSON.stringify({
      birthDate: date.toISOString(),
      lifeExpectancy: exp,
      dailyReminders,
      milestones
    }));
    
    setBirthDate(date);
    setLifeExpectancy(exp);
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
    
    const secondsLeft = Math.max(0, Math.floor(msLeft / 1000));
    const minutesLeft = Math.floor(secondsLeft / 60);
    const hoursLeft = Math.floor(minutesLeft / 60);
    const daysLeft = Math.floor(hoursLeft / 24);
    const weeksLeft = Math.floor(daysLeft / 7);
    const monthsLeft = Math.floor(daysLeft / 30.44);
    const yearsLeft = Math.floor(daysLeft / 365.25);
    
    const totalWeeks = Math.floor(lifeExpectancy * 52.18);
    const weeksLived = Math.floor(msLived / (1000 * 60 * 60 * 24 * 7));
    const percentLived = Math.min(100, (msLived / totalMs) * 100);
    
    // Fun stats
    const heartbeatsLeft = Math.floor(daysLeft * 100000); // ~100k beats/day
    const breathsLeft = Math.floor(daysLeft * 20000); // ~20k breaths/day
    const sunrisesLeft = daysLeft;
    const sleepsLeft = daysLeft;
    const mealsLeft = daysLeft * 3;
    const summersLeft = yearsLeft;
    const christmasesLeft = yearsLeft;
    const fullMoonsLeft = Math.floor(monthsLeft);
    
    setStats({
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
    });
  };

  const shareStats = async () => {
    if (!stats) return;
    
    try {
      await Share.share({
        message: `⏳ Life Countdown\n\nI have approximately:\n• ${stats.yearsLeft} years\n• ${stats.daysLeft.toLocaleString()} days\n• ${stats.sunrisesLeft.toLocaleString()} sunrises\n\n${stats.percentLived.toFixed(1)}% of my life has passed.\n\nRemember: Memento Mori 💀`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addMilestone = (title: string, date: Date, emoji: string) => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title,
      date,
      emoji
    };
    const updated = [...milestones, newMilestone];
    setMilestones(updated);
    AsyncStorage.setItem('lifeCountdown', JSON.stringify({
      birthDate: birthDate?.toISOString(),
      lifeExpectancy,
      dailyReminders,
      milestones: updated
    }));
  };

  const getMilestoneDaysLeft = (date: Date) => {
    const now = new Date();
    const ms = date.getTime() - now.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  // Setup Screen
  if (showSetup) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.setupContainer}>
          <Text style={styles.setupEmoji}>💀</Text>
          <Text style={styles.setupTitle}>Memento Mori</Text>
          <Text style={styles.setupTagline}>Remember that you will die.</Text>
          
          <Text style={styles.setupSubtitle}>When were you born?</Text>
          
          <View style={styles.dateInputRow}>
            <TextInput
              style={styles.dateInput}
              value={birthMonth}
              onChangeText={setBirthMonth}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor="#666"
              maxLength={2}
            />
            <Text style={styles.dateSeparator}>/</Text>
            <TextInput
              style={styles.dateInput}
              value={birthDay}
              onChangeText={setBirthDay}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor="#666"
              maxLength={2}
            />
            <Text style={styles.dateSeparator}>/</Text>
            <TextInput
              style={[styles.dateInput, { width: 80 }]}
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor="#666"
              maxLength={4}
            />
          </View>
          
          <Text style={styles.setupSubtitle}>Life expectancy</Text>
          <View style={styles.expectancyRow}>
            <TextInput
              style={styles.expectancyInput}
              value={expectancy}
              onChangeText={setExpectancy}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.expectancyLabel}>years</Text>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={saveUserData}>
            <Text style={styles.startButtonText}>Face Your Mortality</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main App
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'countdown' && styles.activeTab]}
          onPress={() => setActiveTab('countdown')}
        >
          <Text style={styles.tabText}>⏳</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={styles.tabText}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'milestones' && styles.activeTab]}
          onPress={() => setActiveTab('milestones')}
        >
          <Text style={styles.tabText}>🎯</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={styles.tabText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* COUNTDOWN TAB */}
        {activeTab === 'countdown' && stats && (
          <>
            <View style={styles.header}>
              <Text style={styles.quote}>"{currentQuote}"</Text>
            </View>

            {/* Dramatic Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerNumber}>
                {String(Math.floor(stats.hoursLeft % 24)).padStart(2, '0')}:
                {String(Math.floor(stats.minutesLeft % 60)).padStart(2, '0')}:
                {String(Math.floor(stats.secondsLeft % 60)).padStart(2, '0')}
              </Text>
              <Text style={styles.timerLabel}>until midnight</Text>
            </View>

            {/* Big Number - Days */}
            <View style={styles.bigStatContainer}>
              <Text style={styles.bigNumber}>{stats.daysLeft.toLocaleString()}</Text>
              <Text style={styles.bigLabel}>days remaining</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
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

            {/* Life in Weeks */}
            <View style={styles.weeksSection}>
              <Text style={styles.weeksTitle}>Your Life in Weeks</Text>
              <Text style={styles.weeksSubtitle}>
                Each dot = 1 week • {stats.weeksLived} lived • {stats.weeksLeft} left
              </Text>
              <View style={styles.weeksGrid}>
                {Array.from({ length: Math.min(stats.totalWeeks, 4160) }, (_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.weekDot,
                      i < stats.weeksLived ? styles.weekDotLived : styles.weekDotRemaining
                    ]} 
                  />
                ))}
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={shareStats}>
              <Text style={styles.shareButtonText}>📤 Share My Stats</Text>
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
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addMilestoneButton}
              onPress={() => addMilestone('Retirement', new Date(2050, 0, 1), '🏖️')}
            >
              <Text style={styles.addMilestoneText}>+ Add Milestone</Text>
            </TouchableOpacity>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Daily Reminder</Text>
                <Text style={styles.settingDescription}>Get reminded of your mortality at 8 AM</Text>
              </View>
              <Switch
                value={dailyReminders}
                onValueChange={(value) => {
                  setDailyReminders(value);
                  AsyncStorage.setItem('lifeCountdown', JSON.stringify({
                    birthDate: birthDate?.toISOString(),
                    lifeExpectancy,
                    dailyReminders: value,
                    milestones
                  }));
                }}
                trackColor={{ false: '#333', true: '#ff6b35' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity 
              style={styles.settingButton}
              onPress={() => setShowSetup(true)}
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
  tabBar: {
    flexDirection: 'row',
    paddingTop: 50,
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
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 40,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
    marginTop: 25,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 24,
    padding: 15,
    borderRadius: 10,
    width: 60,
    textAlign: 'center',
  },
  dateSeparator: {
    color: '#444',
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
    color: '#666',
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
    color: '#666',
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
    color: '#666',
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
    color: '#888',
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
    color: '#666',
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
    color: '#666',
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
    color: '#666',
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
    backgroundColor: '#333',
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
    color: '#666',
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
    color: '#888',
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
    color: '#666',
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
    color: '#666',
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
    color: '#666',
    lineHeight: 22,
  },
});
