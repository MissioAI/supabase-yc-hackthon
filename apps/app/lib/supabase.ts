import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get the host URI for local development
const getLocalUrl = () => {
    const origin = Constants.expoConfig?.hostUri?.split(':').shift()

    if (!origin) {
        throw new Error('Could not determine origin')
    }
    // Use appropriate localhost URL based on platform
    return Platform.select({
        ios: `http://${origin}:54321`,
        android: 'http://10.0.2.2:54321',
        default: 'http://localhost:54321'
    })
}

// Use local URL for development, environment variable for production
const supabaseUrl = __DEV__
    ? getLocalUrl()
    : process.env.EXPO_PUBLIC_SUPABASE_URL

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
    throw new Error('Missing Supabase Anon Key')
}

if (!supabaseUrl) {
    throw new Error('Missing Supabase URL')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})