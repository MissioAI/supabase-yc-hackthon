import { Animated, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRef } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Task = {
    id: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
};

interface TaskCardProps {
    task: Task;
    onTaskComplete: (taskId: string) => void;
}

export default function TaskCard({ task, onTaskComplete }: TaskCardProps) {
    const { user } = useAuth();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });
    };

    const handleStatusUpdate = async () => {
        if (!user?.id) return;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(async () => {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .update({ status: 'completed' })
                    .eq('id', task.id)
                    .eq('user_id', user.id);

                if (error) throw error;
                onTaskComplete(task.id);
            } catch (error) {
                console.error('Error updating task status:', error);
                // Reset animations if there's an error
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    })
                ]).start();
            }
        });
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                opacity: fadeAnim,
                transform: [{
                    scale: scaleAnim
                }]
            }
        ]}>
            <ThemedView style={styles.content}>
                <TouchableOpacity
                    style={styles.statusCircle}
                    onPress={handleStatusUpdate}
                    activeOpacity={0.7}
                >
                    <View style={styles.circle}>
                        {task.status === 'completed' && (
                            <IconSymbol
                                name="checkmark"
                                size={16}
                                color="#4CAF50"
                            />
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.contentContainer}>
                    <View style={styles.taskHeader}>
                        <ThemedText
                            type="defaultSemiBold"
                            style={styles.title}
                            numberOfLines={1}
                        >
                            {task.title}
                        </ThemedText>
                        <ThemedView style={[styles.priorityBadge, styles[`priority${task.priority}`]]}>
                            <ThemedText style={styles.priorityText}>
                                {task.priority}
                            </ThemedText>
                        </ThemedView>
                    </View>

                    <View style={styles.taskFooter}>
                        {task.due_date && (
                            <ThemedText style={styles.dueDate}>
                                Due: {formatDate(task.due_date)}
                            </ThemedText>
                        )}
                    </View>
                </View>
            </ThemedView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    content: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e1e1e1',
        flexDirection: 'row',
        alignItems: 'center',
        height: 84,
    },
    statusCircle: {
        marginRight: 12,
        padding: 4,
    },
    circle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        flex: 1,
        marginRight: 8,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
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
    priorityText: {
        fontSize: 12,
        color: '#FFFFFF',
    },
    dueDate: {
        fontSize: 12,
        color: '#666',
    },
});