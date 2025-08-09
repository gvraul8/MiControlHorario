import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';


export default function AddJobScreen({ navigation }) {
  const [jobList, setJobList] = useState<string[]>([]);
  const [newJob, setNewJob] = useState('');

  const loadJobs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'jobs'));
      const jobs: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data && data.name) jobs.push(data.name);
      });
      setJobList(jobs);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los trabajos de Firebase.');
    }
  };

  const saveJob = async () => {
    if (!newJob.trim()) return;
    try {
      await addDoc(collection(db, 'jobs'), { name: newJob.trim() });
      setNewJob('');
      loadJobs();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el trabajo en Firebase.');
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Trabajos Guardados (Firebase)</Text>

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
