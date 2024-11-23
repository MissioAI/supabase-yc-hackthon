import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, ViewStyle, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Input, Divider } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { IconSymbol } from '@/components/ui/IconSymbol';

type Priority = 'low' | 'medium' | 'high';
type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled';

type Task = {
    id: string;
    title: string;
    description: string | null;
    status: Status;
    priority: Priority;
    due_date: string | null;
};

export default function TaskDetailModal() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [task, setTask] = useState<Task | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [status, setStatus] = useState<Status>('pending');
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user?.id && id) {
            console.log('User and ID available, fetching task...');
            fetchTask();
        } else {
            console.log('Waiting for user...', { userId: user?.id, taskId: id });
        }
    }, [id, user]);

    const fetchTask = async () => {
        if (!user?.id || !id) {
            console.log('Missing user.id or task id:', { userId: user?.id, taskId: id });
            return;
        }

        try {
            console.log('Fetching task with id:', id);
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            console.log('Fetched task data:', data);
            if (data) {
                setTask(data);
                setTitle(data.title || '');
                setDescription(data.description || '');
                setPriority(data.priority || 'medium');
                setStatus(data.status || 'pending');
                setDueDate(data.due_date ? new Date(data.due_date) : new Date());
            }
        } catch (error) {
            console.error('Error fetching task:', error);
            Alert.alert('Error', 'Could not fetch task details');
            router.back();
        }
    };

    useEffect(() => {
        console.log('Current title state:', title);
    }, [title]);

    const handleUpdateTask = async () => {
        if (!user?.id || !id || !title.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: title.trim(),
                    description: description.trim(),
                    priority,
                    status,
                    due_date: dueDate.toISOString(),
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            setIsEditing(false);
            fetchTask();
        } catch (error) {
            console.error('Error updating task:', error);
            Alert.alert('Error', 'Could not update task');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async () => {
        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('tasks')
                                .delete()
                                .eq('id', id)
                                .eq('user_id', user?.id);

                            if (error) throw error;
                            router.back();
                        } catch (error) {
                            console.error('Error deleting task:', error);
                            Alert.alert('Error', 'Could not delete task');
                        }
                    },
                },
            ]
        );
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

    const StatusButton = ({ value }: { value: Status }) => (
        <Pressable
            style={[
                styles.statusButton,
                status === value && styles.selectedStatus,
            ]}
            onPress={() => setStatus(value)}
        >
            <ThemedText>
                {value.split('_').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
            </ThemedText>
        </Pressable>
    );

    return (
        <ThemedView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <ThemedText type="title">Task Details</ThemedText>
                    </View>
                    <View style={styles.headerButtons}>
                        {isEditing ? (
                            <>
                                <Button
                                    title="Cancel"
                                    type="clear"
                                    titleStyle={styles.buttonText}
                                    onPress={() => {
                                        setIsEditing(false);
                                        fetchTask();
                                    }}
                                />
                                <Button
                                    title={loading ? "Saving..." : "Save"}
                                    color="primary"
                                    titleStyle={styles.buttonText}
                                    onPress={handleUpdateTask}
                                    disabled={loading || !title.trim()}
                                />
                            </>
                        ) : (
                            <>
                                <Button
                                    title="Edit"
                                    type="clear"
                                    titleStyle={styles.buttonText}
                                    onPress={() => setIsEditing(true)}
                                />
                                <Button
                                    title="Delete"
                                    type="clear"
                                    color="error"
                                    titleStyle={[styles.buttonText, styles.deleteButton]}
                                    onPress={handleDeleteTask}
                                />
                            </>
                        )}
                    </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.content}>
                    <View style={styles.formGroup}>
                        <Input
                            label="Title"
                            value={title}
                            onChangeText={setTitle}
                            disabled={!isEditing}
                            labelStyle={styles.inputLabel}
                            inputStyle={styles.input}
                            containerStyle={styles.inputContainer}
                            placeholder="Task title"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Input
                            label="Description"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            disabled={!isEditing}
                            labelStyle={styles.inputLabel}
                            inputStyle={[styles.input, styles.textArea]}
                            containerStyle={styles.inputContainer}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={styles.sectionTitle}>Priority</ThemedText>
                        <View style={styles.priorityContainer}>
                            <PriorityButton value="low" />
                            <PriorityButton value="medium" />
                            <PriorityButton value="high" />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={styles.sectionTitle}>Status</ThemedText>
                        <View style={styles.statusContainer}>
                            <StatusButton value="pending" />
                            <StatusButton value="in_progress" />
                            <StatusButton value="completed" />
                            <StatusButton value="cancelled" />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={styles.sectionTitle}>Due Date</ThemedText>
                        <Pressable
                            style={[styles.dateButton, !isEditing && styles.disabledButton]}
                            onPress={() => isEditing && setShowDatePicker(true)}>
                            <IconSymbol name="calendar" size={20} color="#666" />
                            <ThemedText style={styles.dateText}>
                                {dueDate.toLocaleDateString()}
                            </ThemedText>
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setDueDate(selectedDate);
                                    }
                                }}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backButton: {
        padding: 8,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
    },
    deleteButton: {
        color: '#dc3545',
    },
    divider: {
        marginVertical: 8,
    },
    content: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        paddingVertical: 8,
    },
    inputContainer: {
        paddingHorizontal: 0,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#666',
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    priorityButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedPriority: {
        borderWidth: 2,
        borderColor: '#000',
    },
    selectedStatus: {
        backgroundColor: '#f0f0f0',
    },
    priorityButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    prioritylow: {
        backgroundColor: '#4CAF50',
    },
    prioritymedium: {
        backgroundColor: '#2196F3',
    },
    priorityhigh: {
        backgroundColor: '#f44336',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    dateText: {
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
}); 