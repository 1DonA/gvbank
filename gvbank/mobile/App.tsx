import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import * as SecureStore from 'expo-secure-store'
import { Text, View, ActivityIndicator } from 'react-native'
import { LoginScreen } from './src/screens/auth/LoginScreen'
import { DashboardScreen } from './src/screens/banking/DashboardScreen'
import { TransferScreen } from './src/screens/banking/TransferScreen'
import { AdminScreen } from './src/screens/admin/AdminScreen'

const Stack = createStackNavigator()
const Tab   = createBottomTabNavigator()
const qc    = new QueryClient()

function CustomerTabs({ user }: { user: any }) {
  const tabs = [
    { name:'Dashboard', icon:'🏠', component:()=><DashboardScreen user={user}/> },
    { name:'Transfer',  icon:'💸', component:()=><TransferScreen  user={user}/> },
    { name:'Cards',     icon:'💳', component:()=><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:40}}>💳</Text><Text style={{color:'#9a9589',marginTop:8}}>Cards — Coming soon</Text></View> },
    { name:'Statements',icon:'📋', component:()=><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:40}}>📋</Text><Text style={{color:'#9a9589',marginTop:8}}>Statements — Coming soon</Text></View> },
    { name:'Profile',   icon:'👤', component:()=><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:40}}>👤</Text><Text style={{color:'#9a9589',marginTop:8}}>Profile — Coming soon</Text></View> },
  ]
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor:'#fff', borderTopColor:'#e4e2dc', height:80, paddingBottom:16, paddingTop:8 },
      tabBarActiveTintColor: '#0a1628',
      tabBarInactiveTintColor: '#9a9589',
      tabBarLabel: route.name,
      tabBarIcon: ({ focused }) => {
        const t = tabs.find(x=>x.name===route.name)
        return <Text style={{fontSize:22, opacity: focused?1:0.5}}>{t?.icon}</Text>
      },
    })}>
      {tabs.map(t => <Tab.Screen key={t.name} name={t.name} component={t.component}/>)}
    </Tab.Navigator>
  )
}

function AppNav() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    SecureStore.getItemAsync('gv_user').then(u => {
      if (u) setUser(JSON.parse(u))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#0a1628'}}><ActivityIndicator color="#c9a84c" size="large"/></View>

  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen}/>
      ) : user.role==='admin' ? (
        <Stack.Screen name="AdminDashboard" component={AdminScreen}/>
      ) : (
        <Stack.Screen name="MainTabs">{()=><CustomerTabs user={user}/>}</Stack.Screen>
      )}
      <Stack.Screen name="Login" component={LoginScreen}/>
      <Stack.Screen name="AdminDashboard" component={AdminScreen}/>
      <Stack.Screen name="MainTabs">{()=><CustomerTabs user={user}/>}</Stack.Screen>
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <NavigationContainer>
          <AppNav/>
        </NavigationContainer>
        <Toast/>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
