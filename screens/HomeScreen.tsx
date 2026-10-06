import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Button,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { generateStyledPDF } from '../utils/generateStyledPDF';
import { Ionicons } from '@expo/vector-icons';

interface WorkEntry {
  job: string;
  hours: number;
}

interface JobData {
  rate: number;
}

const STORAGE_KEYS = {
  WORK_ENTRIES: 'workEntries',
  JOB_LIST: 'jobListWithRates',
  USER_NAME: 'userName',
};

import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen({ }) {

  // Estado para el mes y año seleccionados en el calendario
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const [hours, setHours] = useState('');
  const [entries, setEntries] = useState<Record<string, WorkEntry[]>>({});
  const [jobList, setJobList] = useState<Record<string, JobData>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Calculate summary for selected month (after all state declarations)
  const monthKey = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
  let monthHours = 0;
  let monthMoney = 0;
  Object.entries(entries).forEach(([date, dayEntries]) => {
    if (date.startsWith(monthKey)) {
      dayEntries.forEach(({ job, hours }) => {
        monthHours += hours;
        const rate = jobList[job]?.rate || 0;
        monthMoney += hours * rate;
      });
    }
  });

  const saveEntry = async () => {
    const parsedHours = parseFloat(hours);

    if (!selectedJob || !hours) return Alert.alert('Completa todos los campos');
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      return Alert.alert('Introduce un valor de horas válido (0.25 a 24)');
    }
    if (parsedHours % 0.25 !== 0) {
      return Alert.alert('Las horas deben ser múltiplos de 0.25 (15 minutos)');
    }

    const totalHoursForDay = (entries[selectedDate] || []).reduce((acc, e, idx) => {
      if (idx === editingIndex) return acc; // Excluir si estamos editando
      return acc + e.hours;
    }, 0);

    if (totalHoursForDay + parsedHours > 24) {
      return Alert.alert('No puedes exceder 24 horas en un día');
    }

    const newEntry: WorkEntry = { job: selectedJob, hours: parsedHours };
    const updated = { ...entries };
    if (!updated[selectedDate]) updated[selectedDate] = [];

    if (editingIndex !== null) {
      updated[selectedDate][editingIndex] = newEntry;
    } else {
      updated[selectedDate].push(newEntry);
    }

    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.WORK_ENTRIES, JSON.stringify(updated));

    setSelectedJob('');
    setHours('');
    setEditingIndex(null);
    setModalVisible(false);
  };

  const loadData = async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORK_ENTRIES);
    if (data) setEntries(JSON.parse(data));

    const savedJobs = await AsyncStorage.getItem(STORAGE_KEYS.JOB_LIST);
    if (savedJobs) setJobList(JSON.parse(savedJobs));

    const savedName = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
    if (savedName) {
      setUserName(savedName);
      setIsEditingName(false);
    } else {
      setIsEditingName(true);
    }
  };

  const saveUserName = async (name: string) => {
    setUserName(name);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
  };


  const handleGeneratePDF = async () => {
    try {
      await generateStyledPDF(entries, selectedYear, selectedMonth, userName, jobList);
    } catch (e) {
      Alert.alert('Error al generar PDF', String(e));
    }
  };

  const deleteEntry = async (index: number) => {
    const updated = { ...entries };
    updated[selectedDate].splice(index, 1);
    if (updated[selectedDate].length === 0) delete updated[selectedDate];
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.WORK_ENTRIES, JSON.stringify(updated));
  };

  const startEditEntry = (index: number) => {
    const entry = entries[selectedDate][index];
    setSelectedJob(entry.job);
    setHours(entry.hours.toString());
    setEditingIndex(index);
  };

  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  return (
    <ScrollView style={styles.container}>
      <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8 }}>
        {isEditingName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginRight: 10 }}
              placeholder="Introduce tu nombre"
              value={userName}
              onChangeText={saveUserName}
            />
            <TouchableOpacity onPress={() => setIsEditingName(false)}>
              <Ionicons name="checkmark-circle" size={28} color="#10b981" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Hola, {userName || 'Usuario'}</Text>
            <TouchableOpacity onPress={() => setIsEditingName(true)}>
              <Ionicons name="pencil" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setModalVisible(true);
        }}
        onMonthChange={(monthObj) => {
          setSelectedMonth(monthObj.month - 1); // Calendar da 1-12, JS usa 0-11
          setSelectedYear(monthObj.year);
        }}
        markedDates={Object.fromEntries(
          Object.entries(entries).map(([date]) => [date, { marked: true }])
        )}
        theme={{
          todayTextColor: '#3b82f6',
          selectedDayBackgroundColor: '#3b82f6',
          arrowColor: '#3b82f6',
          dotColor: '#3b82f6',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
        }}
        style={styles.calendar}
      />

      <View style={styles.buttonContainer}>
        <Button title="📄 Descargar PDF" onPress={handleGeneratePDF} color="#2563eb" />
      </View>
      <View style={{ height: 24 }} />
      <View style={{
        backgroundColor: '#e0ecff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2563eb' }}>Resumen de {monthKey}</Text>
        <Text style={{ fontSize: 18, color: '#10b981', fontWeight: 'bold', marginTop: 4 }}>{monthHours.toFixed(2)} h</Text>
        <Text style={{ fontSize: 18, color: '#6366f1', fontWeight: 'bold' }}>{monthMoney.toFixed(2)} €</Text>
      </View>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Agregar Trabajo para {selectedDate}</Text>

          <Text style={styles.label}>Seleccionar Trabajo:</Text>
          <Picker
            selectedValue={selectedJob}
            onValueChange={(itemValue) => setSelectedJob(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Seleccione un trabajo" value="" />
            {Object.keys(jobList).map((job) => (
              <Picker.Item key={job} label={job} value={job} />
            ))}
          </Picker>

          <Text style={styles.label}>Horas trabajadas (de 15 en 15 minutos):</Text>
          <TextInput
            placeholder="Ej: 1.5"
            value={hours}
            onChangeText={setHours}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button title="Guardar" onPress={saveEntry} color="#10b981" />
            <Button title="Cancelar" onPress={() => setModalVisible(false)} color="#ef4444" />
          </View>

          <Text style={styles.label}>Entradas guardadas:</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {(entries[selectedDate] || []).map((item, index) => (
              <View style={styles.entryRow} key={index}>
                <Text style={styles.entryItem}>{item.job}: {item.hours}h</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => startEditEntry(index)}>
                    <Text style={{ color: '#2563eb', marginRight: 8 }}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEntry(index)}>
                    <Text style={{ color: '#ef4444' }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  calendar: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  buttonContainer: {
    marginVertical: 12,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#111827',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 4,
    color: '#374151',
  },
  picker: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  input: {
    backgroundColor: '#e0ecff',
    color: '#111827',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  entryItem: {
    fontSize: 14,
    paddingVertical: 4,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
});
