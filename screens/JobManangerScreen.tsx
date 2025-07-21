// screens/JobManagerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'jobListWithRates';

export default function JobManagerScreen() {
  const [jobList, setJobList] = useState<Record<string, { rate: number }>>({});
  const [newJob, setNewJob] = useState('');
  const [rate, setRate] = useState('');
  const [editingJob, setEditingJob] = useState<string | null>(null);

  const loadJobs = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) setJobList(JSON.parse(saved));
  };

  const saveJob = async () => {
    if (!newJob.trim() || !rate) return Alert.alert('Completa todos los campos');
    const updated = {
      ...jobList,
      [newJob.trim()]: { rate: parseFloat(rate) },
    };
    setJobList(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewJob('');
    setRate('');
  };

  const startEditJob = (job: string) => {
    setEditingJob(job);
    setNewJob(job);
    setRate(jobList[job].rate.toString());
  };

  const deleteJob = async (job: string) => {
    const updated = { ...jobList };
    delete updated[job];
    setJobList(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const confirmEditJob = async () => {
    if (!newJob.trim() || !rate) return Alert.alert('Completa todos los campos');
    const updated = { ...jobList };
    if (editingJob && editingJob !== newJob.trim()) {
      delete updated[editingJob];
    }
    updated[newJob.trim()] = { rate: parseFloat(rate) };
    setJobList(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewJob('');
    setRate('');
    setEditingJob(null);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trabajos Guardados</Text>

      <FlatList
        data={Object.entries(jobList)}
        keyExtractor={([job]) => job}
        renderItem={({ item }) => (
          <View style={styles.jobItem}>
            <View>
              <Text style={styles.jobName}>{item[0]}</Text>
              <Text style={styles.jobRate}>
                €{item[1].rate.toFixed(2)}/h
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => startEditJob(item[0])} style={styles.editBtn}>
                <Text style={{ color: '#2563eb' }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteJob(item[0])} style={styles.deleteBtn}>
                <Text style={{ color: '#ef4444' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TextInput
        placeholder="Nombre del trabajo"
        value={newJob}
        onChangeText={setNewJob}
        style={styles.input}
      />
      <TextInput
        placeholder="Precio por hora (€)"
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Button
        title={editingJob ? "Actualizar trabajo" : "Guardar trabajo"}
        onPress={editingJob ? confirmEditJob : saveJob}
        color="#2563eb"
      />
      {editingJob && (
        <Button
          title="Cancelar edición"
          onPress={() => {
            setEditingJob(null);
            setNewJob('');
            setRate('');
          }}
          color="#ef4444"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  jobRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  input: {
    backgroundColor: '#e0ecff', // azul claro
    color: '#111827', // letras negras
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  editBtn: {
    marginRight: 10,
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
