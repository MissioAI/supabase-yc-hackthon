import { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Pressable, ViewStyle, KeyboardAvoidingView, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Icon, BottomSheet, ListItem } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';

type Priority = 'low' | 'medium' | 'high';
type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export default function CreateTaskModal() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [status, setStatus] = useState<Status>('pending');
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);

    // Handle keyboard show/hide
    React.useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardWillShow', () => {
            setKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const handleCreateTask = async () => {
        if (!user?.id || !title.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('tasks')
                .insert([
                    {
                        user_id: user.id,
                        title: title.trim(),
                        description: description.trim(),
                        priority,
                        status,
                        due_date: dueDate.toISOString(),
                    },
                ]);

            if (error) throw error;
            router.back();
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setLoading(false);
        }
    };

    const PriorityButton = ({ value }: { value: Priority }) => (
        <ThemedView
            style={[
                styles.priorityButton,
                priority === value && styles.selectedPriority,
                styles[`priority${value}` as keyof typeof styles] as ViewStyle,
            ]}>
            <TouchableOpacity onPress={() => setPriority(value)}>
                <ThemedText style={styles.priorityButtonText}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                </ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );

    const ActionButton = ({ icon, label, onPress }: { icon: string, label: string, onPress: () => void }) => (
        <Pressable onPress={onPress} style={styles.actionButton}>
            <Icon name={icon} type="feather" size={20} color="#687076" />
            <ThemedText style={styles.actionButtonText}>{label}</ThemedText>
        </Pressable>
    );

    const priorityOptions: Priority[] = ['low', 'medium', 'high'];

    const PriorityPicker = () => (
        <View style={styles.priorityPicker}>
            {priorityOptions.map((option) => (
                <Pressable
                    key={option}
                    style={[
                        styles.priorityOption,
                        priority === option && styles.selectedPriorityOption,
                        { backgroundColor: option === 'low' ? '#4CAF50' : 
                                         option === 'medium' ? '#FFC107' : '#F44336' }
                    ]}
                    onPress={() => setPriority(option)}
                >
                    <ThemedText style={styles.priorityOptionText}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </ThemedText>
                </Pressable>
            ))}
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
            <ThemedView style={styles.content}>
                <View style={styles.formGroup}>
                    <Input
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Title"
                        label=""
                        autoFocus={true}
                        returnKeyType="next"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Input
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Description"
                        label=""
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.actionButtonsContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <ActionButton 
                        icon="flag" 
                        label={`Priority: ${priority}`} 
                        onPress={() => setShowPriorityPicker(!showPriorityPicker)} 
                    />
                    <ActionButton 
                        icon="clock" 
                        label={dueDate.toLocaleDateString()} 
                        onPress={() => setShowDatePicker(true)} 
                    />
                    <ActionButton 
                        icon="list" 
                        label={`Status: ${status}`} 
                        onPress={() => {/* handle status */}} 
                    />
                </ScrollView>

                {showPriorityPicker && <PriorityPicker />}

                <View style={styles.divider} />

                <View style={[styles.buttonContainer, keyboardVisible && styles.buttonContainerKeyboard]}>
                    <Button
                        icon={
                            <Icon
                                name="arrow-up"
                                type="feather"
                                color="white"
                                size={20}
                            />
                        }
                        onPress={handleCreateTask}
                        disabled={loading || !title.trim()}
                        containerStyle={styles.button}
                        buttonStyle={styles.buttonInner}
                    />
                </View>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: 'white',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    priorityButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    selectedPriority: {
        borderWidth: 2,
        borderColor: '#000',
    },
    priorityButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    prioritylow: {
        backgroundColor: '#4CAF50',
    },
    prioritymedium: {
        backgroundColor: '#FFC107',
    },
    priorityhigh: {
        backgroundColor: '#F44336',
    },
    dateButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    },
    buttonContainerKeyboard: {
        marginTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    buttonInner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#007AFF',
    },
    divider: {
        height: 1,
        backgroundColor: '#E1E1E1',
        marginVertical: 12,
    },
    actionButtonsContainer: {
        flexGrow: 0,
        marginTop: 8,
        marginBottom: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
    },
    actionButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    priorityPicker: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 8,
    },
    priorityOption: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    selectedPriorityOption: {
        borderWidth: 2,
        borderColor: '#000',
    },
    priorityOptionText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
}); 