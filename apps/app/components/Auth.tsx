import React, { useState, useRef } from 'react'
import {
    Alert,
    StyleSheet,
    View,
    Dimensions,
    Text,
    AppState,
    TouchableOpacity,
    TextInput,
    Animated,
    Image
} from 'react-native'
import { supabase } from '../lib/supabase'
import Carousel from 'react-native-reanimated-carousel'
import { Ionicons } from '@expo/vector-icons'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})

const IntroSlide = ({ title, description, image }: {
    title: string,
    description: string,
    image: any
}) => (
    <View style={styles.slideContainer}>
        <View style={styles.imageContainer}>
            {/* <Image source={image} style={styles.slideImage} /> */}
        </View>
        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.slideDescription}>{description}</Text>
    </View>
)

const AuthForm = ({ onSignIn, onSignUp, loading, onBack }: {
    onSignIn: (email: string, password: string) => void,
    onSignUp: (email: string, password: string) => void,
    loading: boolean,
    onBack: () => void
}) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    return (
        <View style={styles.formContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.authTitle}>Welcome Back</Text>
            </View>

            <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>

            <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                />
            </View>

            <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => onSignIn(email, password)}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => onSignUp(email, password)}
                disabled={loading}
            >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Create Account</Text>
            </TouchableOpacity>
        </View>
    )
}

export default function Auth() {
    const [showAuth, setShowAuth] = useState(false)
    const [loading, setLoading] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const width = Dimensions.get('window').width

    const introSlides = [
        {
            title: "Welcome to SupaNotes",
            description: "Your personal task management agent",
            image: null
        },
        {
            title: "Stay Organized",
            description: "Create, track and complete tasks with ease",
            image: null
        },
        {
            title: "Boost Productivity",
            description: "Focus on what matters most to you",
            image: null
        }
    ]

    async function signInWithEmail(email: string, password: string) {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) Alert.alert(error.message)
        setLoading(false)
    }

    async function signUpWithEmail(email: string, password: string) {
        setLoading(true)
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) Alert.alert(error.message)
        if (!session) Alert.alert('Please check your inbox for email verification!')
        setLoading(false)
    }

    return (
        <View style={styles.container}>
            {!showAuth ? (
                <>
                    <Carousel
                        loop={false}
                        width={width}
                        height={width * 1.6}
                        data={introSlides}
                        onProgressChange={(offsetProgress, absoluteProgress) => {
                            setActiveIndex(Math.round(absoluteProgress))
                        }}
                        renderItem={({ item }) => (
                            <IntroSlide
                                title={item.title}
                                description={item.description}
                                image={item.image}
                            />
                        )}
                    />
                    <View style={styles.paginationContainer}>
                        {introSlides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.paginationDot,
                                    activeIndex === index && styles.paginationDotActive
                                ]}
                            />
                        ))}
                    </View>
                    <TouchableOpacity
                        style={[styles.button, styles.getStartedButton]}
                        onPress={() => setShowAuth(true)}
                    >
                        <Text style={styles.getStartedButtonText}>Get Started</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <AuthForm
                    onSignIn={signInWithEmail}
                    onSignUp={signUpWithEmail}
                    loading={loading}
                    onBack={() => setShowAuth(false)}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    slideTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    slideDescription: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
    },
    formContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    authTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
    getStartedButton: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        backgroundColor: '#007bff',
        paddingVertical: 15,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 30,
    },
    backButton: {
        position: 'absolute',
        left: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
    },
    button: {
        paddingVertical: 15,
        borderRadius: 5,
        marginBottom: 10,
    },
    primaryButton: {
        backgroundColor: '#007bff',
    },
    secondaryButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 120,
        width: '100%',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ccc',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#007bff',
        width: 20,
    },
    getStartedButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    imageContainer: {
        width: '100%',
        height: '50%',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    slideImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
})