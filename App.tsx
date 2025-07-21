import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import JobManagerScreen from './screens/JobManangerScreen';
import StatsScreen from './screens/StatsScreen';


const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Calendario') {
              iconName = 'calendar';
            } else if (route.name === 'Trabajos') {
              iconName = 'briefcase';
            } else if (route.name === 'Estadísticas') {
              iconName = 'stats-chart';
            }
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Calendario" component={HomeScreen} />
        <Tab.Screen name="Trabajos" component={JobManagerScreen} />
        <Tab.Screen name="Estadísticas" component={StatsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
