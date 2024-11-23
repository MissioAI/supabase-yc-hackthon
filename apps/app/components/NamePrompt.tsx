import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export default function NamePrompt({ onComplete }: { onComplete: () => void }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { name: name.trim() }
            });

            if (error) throw error;
            onComplete();
        } catch (error) {
            console.error('Error updating user name:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <ThemedView style={styles.background}>
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <ThemedText type="title" style={styles.title}>
                        What should we call you?
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        You can always change this later in your account settings.
                    </ThemedText>

                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                        autoFocus
                        autoCapitalize="words"
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.skipButton]}
                            onPress={handleSkip}
                            disabled={loading}
                        >
                            <ThemedText style={styles.buttonText}>Skip</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.continueButton]}
                            onPress={handleSubmit}
                            disabled={loading || !name.trim()}
                        >
                            <ThemedText style={styles.buttonText}>Continue</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        opacity: 0.7,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginHorizontal: 5,
    },
    skipButton: {
        backgroundColor: '#f0f0f0',
    },
    continueButton: {
        backgroundColor: '#007bff',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
}); 