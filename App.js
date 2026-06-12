import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import GroceryListScreen from './src/screens/GroceryListScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import InviteScreen from './src/screens/InviteScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';

const Stack = createNativeStackNavigator();

// Web URL routing: maps screens to paths so browser refresh restores the
// current screen and Back/Forward navigate the app. Applied on web only;
// native deep-link behavior is unchanged.
const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      Home: '',
      GroceryList: 'list/:listId',
      AddItem: 'add',
      Invite: 'invite',
    },
  },
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="GroceryList" component={GroceryListScreen} />
    <Stack.Screen name="AddItem" component={AddItemScreen} />
    <Stack.Screen name="Invite" component={InviteScreen} />
  </Stack.Navigator>
);

const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#29AB87" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// On wide web viewports, render the app as a centered max-width column over a
// neutral page background (a "desktop app" look). On mobile and narrow web it's
// a transparent passthrough, so the mobile layout is unchanged.
const AppShell = ({ children }) => {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width > 700;

  if (!isWideWeb) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.webPage}>
      <View style={styles.webColumn}>{children}</View>
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <AppShell>
          <Navigation />
        </AppShell>
        <StatusBar style="light" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  webPage: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
  },
  webColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
