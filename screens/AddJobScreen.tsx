import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'jobList';

export default function AddJobScreen({ navigation }) {
  const [jobList, setJobList] = useState<string[]>([]);
  const [newJob, setNewJob] = useState('');

  const loadJobs = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) setJobList(JSON.parse(saved));
  };

  const saveJob = async () => {
    if (!newJob.trim()) return;
    const updated = [...jobList, newJob.trim()];
    setJobList(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewJob('');
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Trabajos Guardados</Text>

      <FlatList
        data={jobList}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={{ padding: 5 }}>{item}</Text>
        )}
      />

      <TextInput
        placeholder="Nuevo trabajo"
        value={newJob}
        onChangeText={setNewJob}
        style={{ borderBottomWidth: 1, marginVertical: 10 }}
      />
      <Button title="Agregar Trabajo" onPress={saveJob} />
      <Button title="Volver al Inicio" onPress={() => navigation.goBack()} />
    </View>
  );
}
