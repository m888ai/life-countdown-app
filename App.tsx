import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Modal,
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

interface LifeStats {
  yearsLeft: number;
  monthsLeft: number;
  weeksLeft: number;
  daysLeft: number;
  hoursLeft: number;
  percentLived: number;
  totalWeeks: number;
  weeksLived: number;
}

export default function App() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(80);
  const [showSetup, setShowSetup] = useState(true);
  const [stats, setStats] = useState<LifeStats | null>(null);
  
  // Setup form state
  const [birthYear, setBirthYear] = useState('1990');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthDay, setBirthDay] = useState('1');
  const [expectancy, setExpectancy] = useState('80');

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

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('lifeCountdown');
      if (data) {
        const parsed = JSON.parse(data);
        setBirthDate(new Date(parsed.birthDate));
        setLifeExpectancy(parsed.lifeExpectancy);
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
      lifeExpectancy: exp
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
    
    setStats({
      yearsLeft,
      monthsLeft,
      weeksLeft,
      daysLeft,
      hoursLeft,
      percentLived,
      totalWeeks,
      weeksLived
    });
  };

  const quotes = [
    "The fear of death follows from the fear of life. Live fully.",
    "Every day is a gift. That's why it's called the present.",
    "Life is what happens while you're busy making other plans.",
    "Your time is limited. Don't waste it living someone else's life.",
    "It is not death that a man should fear, but never beginning to live.",
  ];

  const [currentQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  if (showSetup) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>⏳ Life Countdown</Text>
          <Text style={styles.setupSubtitle}>Enter your birth date</Text>
          
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
          
          <Text style={styles.setupSubtitle}>Life expectancy (years)</Text>
          <TextInput
            style={styles.expectancyInput}
            value={expectancy}
            onChangeText={setExpectancy}
            keyboardType="number-pad"
            maxLength={3}
          />
          
          <TouchableOpacity style={styles.startButton} onPress={saveUserData}>
            <Text style={styles.startButtonText}>Start Living</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⏳ Your Life</Text>
          <Text style={styles.quote}>"{currentQuote}"</Text>
        </View>

        {/* Main Stats */}
        {stats && (
          <>
            {/* Big Number - Years */}
            <View style={styles.bigStatContainer}>
              <Text style={styles.bigNumber}>{stats.yearsLeft}</Text>
              <Text style={styles.bigLabel}>years remaining</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats.percentLived}%` }]} />
              </View>
              <Text style={styles.progressText}>{stats.percentLived.toFixed(1)}% of life lived</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.monthsLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>months</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.weeksLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>weeks</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.daysLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>days</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.hoursLeft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>hours</Text>
              </View>
            </View>

            {/* Life in Weeks Grid */}
            <View style={styles.weeksSection}>
              <Text style={styles.weeksTitle}>Your Life in Weeks</Text>
              <Text style={styles.weeksSubtitle}>
                {stats.weeksLived} lived • {stats.weeksLeft} remaining
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

            {/* Motivation */}
            <View style={styles.motivationSection}>
              <Text style={styles.motivationTitle}>Make it count.</Text>
              <Text style={styles.motivationText}>
                Every week that passes is a week you'll never get back. 
                What will you do with the {stats.weeksLeft.toLocaleString()} weeks you have left?
              </Text>
            </View>
          </>
        )}

        {/* Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={() => setShowSetup(true)}
        >
          <Text style={styles.resetButtonText}>Change Settings</Text>
        </TouchableOpacity>

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
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  setupTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
    marginTop: 20,
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
  expectancyInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 32,
    padding: 15,
    borderRadius: 10,
    width: 100,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 40,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  quote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bigStatContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  bigNumber: {
    fontSize: 120,
    fontWeight: '200',
    color: '#ff6b35',
  },
  bigLabel: {
    fontSize: 18,
    color: '#888',
    marginTop: -10,
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b35',
    borderRadius: 4,
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
    marginBottom: 30,
  },
  statBox: {
    width: '50%',
    padding: 15,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  weeksSection: {
    padding: 20,
    marginBottom: 20,
  },
  weeksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  weeksSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
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
  motivationSection: {
    padding: 30,
    backgroundColor: '#111',
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  motivationTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#444',
    fontSize: 14,
  },
});
