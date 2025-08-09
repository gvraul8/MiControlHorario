import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, PieChart } from 'react-native-chart-kit';

interface WorkEntry {
  job: string;
  hours: number;
}

interface JobData {
  rate: number;
}

type Totals = {
  money: number;
  hours: number;
};

function getWeek(dateStr: string) {
  const d = new Date(dateStr);
  const onejan = new Date(d.getFullYear(), 0, 1);
  // @ts-ignore
  return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

const TABS = [
  { key: 'weekly', label: 'Semana' },
  { key: 'daily', label: 'Día' },
  { key: 'monthly', label: 'Mes' },
  { key: 'byJob', label: 'Trabajo' },
];

function getCurrentWeekKey() {
  const today = new Date();
  const year = today.getFullYear();
  const week = getWeek(today.toISOString().slice(0, 10));
  return `${year}-W${week}`;
}

function getCurrentMonthKey() {
  const today = new Date();
  return today.toISOString().slice(0, 7); // "YYYY-MM"
}

export default function StatsScreen() {
  const [totals, setTotals] = useState<{
    daily: Record<string, Totals>;
    weekly: Record<string, Totals>;
    monthly: Record<string, Totals>;
    byJob: Record<string, Totals>;
  }>({
    daily: {},
    weekly: {},
    monthly: {},
    byJob: {},
  });
  const [entries, setEntries] = useState<Record<string, WorkEntry[]>>({});

  // Cambia el tab por defecto a 'monthly'
  const [selectedTab, setSelectedTab] = useState<'weekly' | 'daily' | 'monthly' | 'byJob'>('monthly');
  const [currentMonthKey, setCurrentMonthKey] = useState(getCurrentMonthKey());

  // New state for UI controls
  const [showMoney, setShowMoney] = useState(true); // Toggle for money/work
  const [orderBy, setOrderBy] = useState<'date' | 'money' | 'hours'>('date');
  const [orderAsc, setOrderAsc] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const entriesRaw = await AsyncStorage.getItem('workEntries');
      const jobsRaw = await AsyncStorage.getItem('jobListWithRates');
      if (!entriesRaw || !jobsRaw) return;

      const entries: Record<string, WorkEntry[]> = JSON.parse(entriesRaw);
      const jobList: Record<string, JobData> = JSON.parse(jobsRaw);

      const byJob: Record<string, Totals> = {};
      const daily: Record<string, Totals> = {};
      const weekly: Record<string, Totals> = {};
      const monthly: Record<string, Totals> = {};

      Object.entries(entries).forEach(([date, dayEntries]) => {
        let dayTotal: Totals = { money: 0, hours: 0 };
        dayEntries.forEach(({ job, hours }) => {
          const rate = jobList[job]?.rate || 0;
          dayTotal.money += hours * rate;
          dayTotal.hours += hours;

          // Por trabajo
          if (!byJob[job]) byJob[job] = { money: 0, hours: 0 };
          byJob[job].money += hours * rate;
          byJob[job].hours += hours;
        });
        daily[date] = dayTotal;

        // Semana y mes
        const weekKey = `${date.slice(0, 4)}-W${getWeek(date)}`;
        const monthKey = date.slice(0, 7);
        if (!weekly[weekKey]) weekly[weekKey] = { money: 0, hours: 0 };
        if (!monthly[monthKey]) monthly[monthKey] = { money: 0, hours: 0 };
        weekly[weekKey].money += dayTotal.money;
        weekly[weekKey].hours += dayTotal.hours;
        monthly[monthKey].money += dayTotal.money;
        monthly[monthKey].hours += dayTotal.hours;
      });

      setTotals({ daily, weekly, monthly, byJob });
      setEntries(entries);
      setCurrentMonthKey(getCurrentMonthKey());
    };

    fetchStats();
  }, []);

  // Filtrado para mostrar solo el mes actual por defecto
  let data: [string, Totals][] = [];
  let sectionTitle = '';
  if (selectedTab === 'monthly') {
    data = Object.entries(totals.monthly).filter(([key]) => key === currentMonthKey);
    sectionTitle = `Mes actual (${currentMonthKey})`;
  } else if (selectedTab === 'weekly') {
    data = Object.entries(totals.weekly);
    sectionTitle = 'Totales semanales';
  } else if (selectedTab === 'daily') {
    data = Object.entries(totals.daily);
    sectionTitle = 'Totales diarios';
  } else if (selectedTab === 'byJob') {
    data = Object.entries(totals.byJob);
    sectionTitle = 'Totales por trabajo';
  }

  // For daily summary below the graph
  let dailyData: [string, Totals][] = Object.entries(totals.daily);
  // Filtering and ordering
  if (orderBy === 'money') {
    dailyData = dailyData.sort((a, b) => orderAsc ? a[1].money - b[1].money : b[1].money - a[1].money);
  } else if (orderBy === 'hours') {
    dailyData = dailyData.sort((a, b) => orderAsc ? a[1].hours - b[1].hours : b[1].hours - a[1].hours);
  } else {
    dailyData = dailyData.sort((a, b) => orderAsc ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]));
  }

  const screenWidth = Dimensions.get('window').width - 40;
  const screenHeight = Dimensions.get('window').height;
  const chartHeight = Math.floor(screenHeight * 0.4); // 40% of screen

  // Selecciona el periodo según el tab activo
  const period: 'daily' | 'weekly' | 'monthly' =
    selectedTab === 'daily' ? 'daily' : selectedTab === 'weekly' ? 'weekly' : 'monthly';

  const jobHours = getHoursByJobForPeriod(period);
  const jobLabels = Object.keys(jobHours);
  const jobData = Object.values(jobHours);

  // Mueve aquí la función:
  function getHoursByJobForPeriod(period: 'daily' | 'weekly' | 'monthly') {
    let periodKey = '';
    if (period === 'daily') periodKey = new Date().toISOString().slice(0, 10);
    if (period === 'weekly') {
      const today = new Date();
      const year = today.getFullYear();
      const week = getWeek(today.toISOString().slice(0, 10));
      periodKey = `${year}-W${week}`;
    }
    if (period === 'monthly') periodKey = new Date().toISOString().slice(0, 7);

    // Agrupa horas por trabajo según el periodo
    const jobHours: Record<string, number> = {};
    Object.entries(totals.daily).forEach(([date]) => {
      let match = false;
      if (period === 'daily' && date === periodKey) match = true;
      if (period === 'weekly') {
        const weekKey = `${date.slice(0, 4)}-W${getWeek(date)}`;
        if (weekKey === periodKey) match = true;
      }
      if (period === 'monthly' && date.slice(0, 7) === periodKey) match = true;
      if (match && entries[date]) {
        entries[date].forEach((entry: WorkEntry) => {
          jobHours[entry.job] = (jobHours[entry.job] || 0) + entry.hours;
        });
      }
    });
    return jobHours;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Estadísticas</Text>
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.tabActive
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.key && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Text style={{ marginRight: 8, color: showMoney ? '#2563eb' : '#10b981', fontWeight: 'bold' }}>{showMoney ? 'Dinero' : 'Horas'}</Text>
        <Switch
          value={showMoney}
          onValueChange={setShowMoney}
          thumbColor={showMoney ? '#2563eb' : '#10b981'}
          trackColor={{ false: '#a7f3d0', true: '#93c5fd' }}
        />
      </View>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {/* LineChart for time series (monthly, weekly, daily) */}
      {['monthly', 'weekly', 'daily'].includes(selectedTab) && data.length > 0 && (
        <LineChart
          data={{
            labels: data.map(([key]) => key.length > 6 ? key.slice(-5) : key),
            datasets: [{ data: data.map(([, value]) => showMoney ? value.money : value.hours) }]
          }}
          width={screenWidth}
          height={chartHeight}
          yAxisLabel={showMoney ? '€' : ''}
          yAxisSuffix={showMoney ? '' : 'h'}
          chartConfig={{
            backgroundColor: '#f9fafb',
            backgroundGradientFrom: '#f9fafb',
            backgroundGradientTo: '#f9fafb',
            decimalPlaces: showMoney ? 2 : 1,
            color: (opacity = 1) => showMoney ? `rgba(37, 99, 235, ${opacity})` : `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            style: { borderRadius: 8 },
            propsForDots: { r: '6', strokeWidth: '2', stroke: showMoney ? '#2563eb' : '#10b981' }
          }}
          style={{ marginVertical: 8, borderRadius: 8 }}
          fromZero
        />
      )}

      {/* PieChart for job distribution */}
      {selectedTab === 'byJob' && data.length > 0 && (
        <PieChart
          data={data.map(([key, value], i) => ({
            name: key,
            population: showMoney ? value.money : value.hours,
            color: ['#2563eb', '#10b981', '#6366f1', '#f59e42', '#ef4444', '#fbbf24', '#a3e635', '#f472b6'][i % 8],
            legendFontColor: '#374151',
            legendFontSize: 14
          }))}
          width={screenWidth}
          height={chartHeight}
          chartConfig={{
            backgroundColor: '#f9fafb',
            backgroundGradientFrom: '#f9fafb',
            backgroundGradientTo: '#f9fafb',
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
          }}
          accessor={'population'}
          backgroundColor={'transparent'}
          paddingLeft={'8'}
          absolute
        />
      )}

      {/* Filtros y orden para resumen diario */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
        <Text style={{ fontWeight: 'bold', color: '#2563eb' }}>Resumen diario</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setOrderBy('date')} style={{ marginHorizontal: 4 }}>
            <Text style={{ color: orderBy === 'date' ? '#2563eb' : '#888' }}>Fecha</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOrderBy('money')} style={{ marginHorizontal: 4 }}>
            <Text style={{ color: orderBy === 'money' ? '#2563eb' : '#888' }}>Dinero</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOrderBy('hours')} style={{ marginHorizontal: 4 }}>
            <Text style={{ color: orderBy === 'hours' ? '#2563eb' : '#888' }}>Horas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOrderAsc(a => !a)} style={{ marginHorizontal: 4 }}>
            <Text style={{ color: '#2563eb' }}>{orderAsc ? '↑' : '↓'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ maxHeight: Math.floor(screenHeight * 0.5) }}>
        {dailyData.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center' }}>Sin datos</Text>
        ) : (
          dailyData.map((item) => (
            <View style={styles.item} key={item[0]}>
              <Text style={styles.job}>{item[0]}</Text>
              <View>
                <Text style={styles.amount}>{item[1].money.toFixed(2)} €</Text>
                <Text style={styles.hours}>{item[1].hours.toFixed(2)} h</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    color: '#374151',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    color: '#2563eb',
    textAlign: 'center',
  },
  item: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
  },
  job: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  hours: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
});
