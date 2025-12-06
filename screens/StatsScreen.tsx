import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Switch, Modal, Button, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackedBarChart, PieChart } from 'react-native-chart-kit';
import { Calendar, DateData } from 'react-native-calendars';

// --- INTERFACES ---
interface WorkEntry {
  job: string;
  hours: number;
  date: string; // Add date to the entry itself
}

interface JobInfo {
  rate: number;
  color: string;
}

// --- DATE HELPERS ---
function getWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // @ts-ignore
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const TABS = [
  { key: 'weekly', label: 'Semana' },
  { key: 'monthly', label: 'Mes' },
  { key: 'daily', label: 'Días' },
  { key: 'byJob', label: 'Trabajos' },
];

const FILTER_MODES = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'range', label: 'Rango' },
];

// --- COMPONENT ---
export default function StatsScreen() {
  // --- STATE ---
  const [selectedTab, setSelectedTab] = useState<'weekly' | 'monthly' | 'daily' | 'byJob'>('weekly');
  const [displayMode, setDisplayMode] = useState<'hours' | 'money'>('hours');
  const [filterMode, setFilterMode] = useState<'week' | 'month' | 'range'>('week');
  
  const [currentDate, setCurrentDate] = useState(new Date()); // For week/month navigation
  const [dateRange, setDateRange] = useState<{ startDate: string, endDate: string }>({ startDate: '', endDate: '' });
  
  const [allEntries, setAllEntries] = useState<Record<string, WorkEntry[]>>({});
  const [jobInfo, setJobInfo] = useState<Record<string, JobInfo>>({});
  
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ startDate: string | null, endDate: string | null }>({ startDate: null, endDate: null });
  const [markedDates, setMarkedDates] = useState({});

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchAndProcessData = async () => {
      const entriesRaw = await AsyncStorage.getItem('workEntries');
      const jobsRaw = await AsyncStorage.getItem('jobListWithRates');
      if (!entriesRaw || !jobsRaw) return;

      const entries: Record<string, WorkEntry[]> = JSON.parse(entriesRaw);
      setAllEntries(entries);

      const jobList: Record<string, { rate: number }> = JSON.parse(jobsRaw);
      const jobs = Object.keys(jobList);
      const colors = ['#2563eb', '#10b981', '#6366f1', '#f59e42', '#ef4444', '#fbbf24'];
      const assignedJobInfo: Record<string, JobInfo> = {};
      jobs.forEach((job, index) => {
        assignedJobInfo[job] = {
          rate: jobList[job].rate,
          color: colors[index % colors.length],
        };
      });
      setJobInfo(assignedJobInfo);
    };

    fetchAndProcessData();
  }, []);

  // --- DATE FILTER LOGIC ---
  useEffect(() => {
    if (filterMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDateRange({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
    } else if (filterMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      setDateRange({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
    }
  }, [currentDate, filterMode]);

  const handleDateNav = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const increment = direction === 'prev' ? -1 : 1;
    if (filterMode === 'week') newDate.setDate(newDate.getDate() + (7 * increment));
    if (filterMode === 'month') newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const onDayPress = (day: DateData) => {
    if (!tempDateRange.startDate || (tempDateRange.startDate && tempDateRange.endDate)) {
      const newStartDate = day.dateString;
      setTempDateRange({ startDate: newStartDate, endDate: null });
      setMarkedDates({ [newStartDate]: { startingDay: true, color: '#2563eb', textColor: 'white' } });
    } else {
      let start = new Date(tempDateRange.startDate);
      let end = new Date(day.dateString);
      if (start > end) [start, end] = [end, start];
      
      const range: Record<string, { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean; }> = {};
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().slice(0, 10);
        range[dateString] = { color: '#93c5fd', textColor: 'white' };
      }
      range[start.toISOString().slice(0, 10)] = { ...range[start.toISOString().slice(0, 10)], startingDay: true };
      range[end.toISOString().slice(0, 10)] = { ...range[end.toISOString().slice(0, 10)], endingDay: true };
      
      setTempDateRange({ startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
      setMarkedDates(range);
    }
  };

  const applyDateFilter = () => {
    if (tempDateRange.startDate && tempDateRange.endDate) {
      setDateRange({ startDate: tempDateRange.startDate, endDate: tempDateRange.endDate });
      setFilterMode('range');
      setCalendarVisible(false);
    }
  };

  // --- DATA PROCESSING ---
  const filteredEntries = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    
    return Object.entries(allEntries)
      .filter(([date]) => date >= dateRange.startDate && date <= dateRange.endDate)
      .flatMap(([date, entries]) => entries.map(entry => ({ ...entry, date })));
  }, [allEntries, dateRange]);

  const getHeaderTitle = () => {
    if (filterMode === 'range') return `${dateRange.startDate} - ${dateRange.endDate}`;
    if (filterMode === 'week') {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        return `${start.toLocaleDateString('es-ES', {day:'numeric', month:'short'})} - ${end.toLocaleDateString('es-ES', {day:'numeric', month:'short'})}`;
    }
    if (filterMode === 'month') {
        return new Date(currentDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    return '';
  };

  const renderCharts = () => {
    const screenWidth = Dimensions.get('window').width - 20;
    const jobs = Object.keys(jobInfo);
    const colors = Object.values(jobInfo).map(j => j.color);

    if (selectedTab === 'byJob') {
        const jobTotals = filteredEntries.reduce((acc, entry) => {
            const value = displayMode === 'hours' ? entry.hours : entry.hours * (jobInfo[entry.job]?.rate || 0);
            acc[entry.job] = (acc[entry.job] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        const pieData = jobs.map(job => ({
            name: job,
            population: jobTotals[job] || 0,
            color: jobInfo[job]?.color || '#ccc',
            legendFontColor: '#374151',
            legendFontSize: 14,
        })).filter(item => item.population > 0);

        return pieData.length > 0 ? (
            <View>
                <PieChart
                    data={pieData}
                    width={screenWidth}
                    height={220}
                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                    hasLegend={false}
                />
                <View style={styles.legendContainer}>
                    {pieData.map(item => (
                        <View key={item.name} style={styles.legendItem}>
                            <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText}>{item.name}: </Text>
                            <Text style={styles.legendValue}>
                                {displayMode === 'money' 
                                    ? `${item.population.toFixed(2)} €` 
                                    : `${item.population.toFixed(2)} h`}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        ) : <Text style={styles.emptyText}>Sin datos para el gráfico.</Text>;
    }
    
    let labels: string[] = [];
    let data: number[][] = [];

    if (selectedTab === 'weekly') {
        labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const weekData: Record<number, Record<string, number>> = {}; // 0=Mon, 6=Sun

        filteredEntries.forEach(entry => {
            let dayIndex = new Date(entry.date).getUTCDay() -1; // Monday is 0
            if (dayIndex === -2) dayIndex = 6; // Sunday
            if (!weekData[dayIndex]) weekData[dayIndex] = {};
            const value = displayMode === 'hours' ? entry.hours : entry.hours * (jobInfo[entry.job]?.rate || 0);
            weekData[dayIndex][entry.job] = (weekData[dayIndex][entry.job] || 0) + value;
        });
        data = Array.from({ length: 7 }, (_, i) => jobs.map(job => weekData[i]?.[job] || 0));
    }

    if (selectedTab === 'monthly') {
        const monthData: Record<number, Record<string, number>> = {}; // Key is week number
        filteredEntries.forEach(entry => {
            const weekNum = getWeek(new Date(entry.date));
            if (!monthData[weekNum]) monthData[weekNum] = {};
            const value = displayMode === 'hours' ? entry.hours : entry.hours * (jobInfo[entry.job]?.rate || 0);
            monthData[weekNum][entry.job] = (monthData[weekNum][entry.job] || 0) + value;
        });
        labels = Object.keys(monthData).map(w => `S${w}`).sort();
        data = labels.map(label => {
            const weekNum = parseInt(label.substring(1));
            return jobs.map(job => monthData[weekNum]?.[job] || 0);
        });
    }
    
    const chartData = { labels, legend: jobs, data, barColors: colors };

    return data.flat().reduce((a, b) => a + b, 0) > 0 ? (
        <StackedBarChart
            style={{ borderRadius: 8, marginTop: 10 }}
            data={chartData}
            width={screenWidth}
            height={300}
            chartConfig={{
                backgroundColor: '#f9fafb',
                backgroundGradientFrom: '#f9fafb',
                backgroundGradientTo: '#f9fafb',
                color: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            }}
            withHorizontalLabels
            hideLegend={false}
        />
    ) : <Text style={styles.emptyText}>Sin datos para este período.</Text>;
  }

  const listData = useMemo(() => {
    if (selectedTab === 'daily') {
      return filteredEntries.map((entry, index) => ({ ...entry, id: `${entry.date}-${index}` }));
    }
    return []; // Return empty array for chart tabs
  }, [selectedTab, filteredEntries]);

  const renderHeader = () => (
    <>      
      {/* 1. Main Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => {
              setSelectedTab(tab.key as any);
              if (tab.key === 'weekly') {
                setFilterMode('week');
                setCurrentDate(new Date());
              } else if (tab.key === 'monthly') {
                setFilterMode('month');
                setCurrentDate(new Date());
              }
            }}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FILTERS SECTION */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filtros</Text>
        <View style={styles.filterControls}>
            {/* 2. Switch */}
            <View style={[styles.mainControls, (selectedTab === 'weekly' || selectedTab === 'monthly') && {flex: 1}]}>
                <View style={styles.switchContainer}>
                <Text style={styles.controlLabel}>Horas</Text>
                <Switch
                    style={{ transform: [{ scale: 0.8 }] }}
                    value={displayMode === 'money'}
                    onValueChange={(val) => setDisplayMode(val ? 'money' : 'hours')}
                    thumbColor={displayMode === 'money' ? '#10b981' : '#2563eb'}
                    trackColor={{ false: '#93c5fd', true: '#a7f3d0' }}
                />
                <Text style={styles.controlLabel}>Dinero</Text>
                </View>
            </View>

            {/* 3. Date Filter */}
            {(selectedTab === 'daily' || selectedTab === 'byJob') && (
              <View style={[styles.tabs, { flex: 1.5, marginLeft: 10 }]}>
                  {FILTER_MODES.map(mode => (
                  <TouchableOpacity
                      key={mode.key}
                      style={[styles.tab, filterMode === mode.key && styles.tabActive]}
                      onPress={() => {
                      if (mode.key === 'range') {
                          setTempDateRange({ startDate: null, endDate: null });
                          setMarkedDates({});
                          setCalendarVisible(true);
                      } else {
                          setFilterMode(mode.key as any);
                          setCurrentDate(new Date());
                      }
                      }}
                  >
                      <Text style={[styles.tabText, filterMode === mode.key && styles.tabTextActive]}>{mode.label}</Text>
                  </TouchableOpacity>
                  ))}
              </View>
            )}
        </View>
      </View>
      
      {filterMode !== 'range' && (
        <View style={styles.dateNavigator}>
          <TouchableOpacity onPress={() => handleDateNav('prev')} style={styles.dateNavButton}><Text style={styles.dateNavButtonText}>Anterior</Text></TouchableOpacity>
          <Text style={styles.dateHeaderText}>{getHeaderTitle()}</Text>
          <TouchableOpacity onPress={() => handleDateNav('next')} style={styles.dateNavButton}><Text style={styles.dateNavButtonText}>Siguiente</Text></TouchableOpacity>
        </View>
      )}
      {filterMode === 'range' && <Text style={styles.dateHeaderTextCenter}>{getHeaderTitle()}</Text>}

      {/* 4. Charts (if not daily tab) */}
      {selectedTab !== 'daily' && renderCharts()}
    </>
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={listData}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={[styles.job, { color: jobInfo[item.job]?.color || '#374151' }]}>{item.job}</Text>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <Text style={styles.hours}>
              {displayMode === 'hours'
                ? `${item.hours.toFixed(2)} h`
                : `${(item.hours * (jobInfo[item.job]?.rate || 0)).toFixed(2)} €`}
            </Text>
          </View>
        )}
        ListEmptyComponent={selectedTab === 'daily' ? <Text style={styles.emptyText}>Sin datos en este rango.</Text> : null}
      />

      <Modal visible={isCalendarVisible} animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Calendar onDayPress={onDayPress} markedDates={markedDates} markingType="period" />
          <View style={{ marginTop: 20 }}><Button title="Aplicar" onPress={applyDateFilter} disabled={!tempDateRange.startDate || !tempDateRange.endDate} /></View>
          <View style={{ marginTop: 10 }}><Button title="Cancelar" onPress={() => setCalendarVisible(false)} color="grey" /></View>
        </View>
      </Modal>
    </>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 15, 
    backgroundColor: '#f8f9fa' 
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#2c3e50', 
    textAlign: 'center', 
    marginVertical: 20 
  },
  mainControls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 2,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  switchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  controlLabel: { 
    marginHorizontal: 4, 
    fontWeight: '600', 
    fontSize: 14,
    color: '#34495e' 
  },
  tabs: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    backgroundColor: '#eef2f5', 
    overflow: 'hidden', 
    padding: 4,
  },
  tab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { 
    backgroundColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  tabText: { 
    color: '#7f8c8d', 
    fontWeight: 'bold' 
  },
  tabTextActive: { 
    color: '#2980b9' 
  },
  filterSection: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateNavigator: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 10,
  },
  dateHeaderText: { 
    fontWeight: 'bold', 
    fontSize: 16, 
    color: '#2c3e50' 
  },
  dateHeaderTextCenter: { 
    fontWeight: 'bold', 
    fontSize: 16, 
    color: '#2c3e50', 
    textAlign: 'center', 
    marginVertical: 16 
  },
  dateNavButton: { 
    backgroundColor: '#ffffff', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2.22,
    elevation: 3,
  },
  dateNavButtonText: { 
    color: '#3498db', 
    fontWeight: 'bold' 
  },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20,
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  job: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  hours: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#34495e' 
  },
  dateText: { 
    fontSize: 12, 
    color: '#7f8c8d',
    marginTop: 4,
  },
  emptyText: { 
    textAlign: 'center', 
    marginVertical: 50, 
    fontSize: 16, 
    color: '#95a5a6' 
  },
  legendContainer: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 10,
  },
  legendColorBox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#34495e',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});
