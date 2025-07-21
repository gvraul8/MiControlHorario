import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from 'react-native-chart-kit';

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
    sectionTitle = 'Totales por +';
  }

  const screenWidth = Dimensions.get('window').width - 40;

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
    <View style={styles.container}>
      <Text style={styles.title}>Estadísticas de Ganancias</Text>
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
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {/* Gráfico de barras */}
      {data.length > 0 && (
        <BarChart
          data={{
            labels: data.map(([key]) => key.length > 6 ? key.slice(-5) : key), // etiquetas cortas
            datasets: [{ data: data.map(([, value]) => value.money) }]
          }}
          width={screenWidth}
          height={180}
          yAxisLabel="€"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: "#f9fafb",
            backgroundGradientFrom: "#f9fafb",
            backgroundGradientTo: "#f9fafb",
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            style: { borderRadius: 8 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: "#2563eb" }
          }}
          style={{ marginVertical: 8, borderRadius: 8 }}
          fromZero
          showValuesOnTopOfBars
        />
      )}

      {jobLabels.length > 0 && (
        <BarChart
          data={{
            labels: jobLabels,
            datasets: [{ data: jobData }]
          }}
          width={screenWidth}
          height={180}
          yAxisLabel=""
          yAxisSuffix="h"
          chartConfig={{
            backgroundColor: "#f9fafb",
            backgroundGradientFrom: "#f9fafb",
            backgroundGradientTo: "#f9fafb",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            style: { borderRadius: 8 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: "#10b981" }
          }}
          style={{ marginVertical: 8, borderRadius: 8 }}
          fromZero
          showValuesOnTopOfBars
        />
      )}

      <FlatList
        data={data}
        keyExtractor={([key]) => key}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.job}>{item[0]}</Text>
            <View>
              <Text style={styles.amount}>{item[1].money.toFixed(2)} €</Text>
              <Text style={styles.hours}>{item[1].hours.toFixed(2)} h</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>Sin datos</Text>}
      />
    </View>
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
