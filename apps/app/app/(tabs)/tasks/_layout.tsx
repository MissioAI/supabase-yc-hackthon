import { Stack } from 'expo-router';
import { Pressable, Platform, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

export default function TasksLayout() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const baseHeight = Platform.select({
        ios: 340,
        android: 360,
    });

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
                name="create"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    headerShown: false,
                    contentStyle: {
                        maxHeight: (baseHeight || 0) + keyboardHeight,
                        marginTop: 'auto',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        paddingTop: 15,
                        backgroundColor: 'white',
                    },
                    gestureEnabled: true,
                    sheetGrabberVisible: true,
                    gestureDirection: 'vertical',
                    animationDuration: 200,
                    gestureResponseDistance: {
                        start: 100,
                        end: 100,
                    },
                    fullScreenGestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    headerShown: false,
                    contentStyle: {
                        paddingTop: 15,
                    },
                    gestureEnabled: true,
                    sheetGrabberVisible: true
                }}
            />

        </Stack>
    );
} 