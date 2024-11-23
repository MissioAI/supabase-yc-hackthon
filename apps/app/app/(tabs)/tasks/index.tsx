import { StyleSheet, View, FlatList, RefreshControl, Pressable, Animated, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskCard from '@/components/TaskCard';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
};

type TaskSection = {
  title: string;
  data: Task[];
};

export default function TasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const [organizedTasks, setOrganizedTasks] = useState<TaskSection[]>([]);
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeout = useRef<NodeJS.Timeout>();

  const organizeTasks = (tasks: Task[]) => {
    const today = new Date();
    const sections: TaskSection[] = [
      {
        title: "Due Today",
        data: tasks.filter(task => {
          if (!task.due_date || task.status === 'completed') return false;
          const dueDate = new Date(task.due_date);
          return dueDate.toDateString() === today.toDateString();
        })
      },
      {
        title: "In Progress",
        data: tasks.filter(task =>
          task.status === 'in_progress'
        )
      },
      {
        title: "High Priority",
        data: tasks.filter(task =>
          task.priority === 'high' && task.status === 'pending'
        )
      },
      {
        title: "Upcoming Tasks",
        data: tasks.filter(task => {
          if (!task.due_date || task.status === 'completed') return false;
          const dueDate = new Date(task.due_date);
          return dueDate > today;
        })
      },
      {
        title: "Recently Added",
        data: tasks.filter(task =>
          task.status === 'pending'
        ).slice(0, 5)
      }
    ];

    // Only keep sections that have data
    setOrganizedTasks(sections.filter(section => section.data.length > 0));
  };

  const fetchTasks = async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      organizeTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    let channel: RealtimeChannel;

    if (user?.id) {
      channel = supabase
        .channel('tasks_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Realtime change received:', payload);

            switch (payload.eventType) {
              case 'INSERT':
                setTasks(current => {
                  const newTasks = [payload.new as Task, ...current];
                  organizeTasks(newTasks);
                  return newTasks;
                });
                break;
              case 'UPDATE':
                setTasks(current => {
                  const updatedTasks = current.map(task =>
                    task.id === payload.new.id ? payload.new as Task : task
                  );
                  organizeTasks(updatedTasks);
                  return updatedTasks;
                });
                break;
              case 'DELETE':
                setTasks(current => {
                  const filteredTasks = current.filter(task => task.id !== payload.old.id);
                  organizeTasks(filteredTasks);
                  return filteredTasks;
                });
                break;
            }
          }
        )
        .subscribe();
    }

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleTaskComplete = (taskId: string) => {
    const completedTask = tasks.find(t => t.id === taskId);
    if (completedTask) {
      setLastCompletedTask(completedTask);
      setShowUndo(true);

      // Clear existing timeout if there is one
      if (undoTimeout.current) {
        clearTimeout(undoTimeout.current);
      }

      // Set new timeout
      undoTimeout.current = setTimeout(() => {
        setShowUndo(false);
        setLastCompletedTask(null);
      }, 3000);
    }
  };

  const handleUndo = async () => {
    if (!lastCompletedTask || !user?.id) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'pending' })
        .eq('id', lastCompletedTask.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setShowUndo(false);
      setLastCompletedTask(null);
    } catch (error) {
      console.error('Error undoing task completion:', error);
    }
  };

  if (!user?.id) {
    return <ThemedText>No user found</ThemedText>;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.titleContainer}>
          <ThemedText type="title">Tasks</ThemedText>
        </View>

        {loading ? (
          <ThemedText>Loading tasks...</ThemedText>
        ) : organizedTasks.length === 0 ? (
          <ThemedText>No tasks</ThemedText>
        ) : (
          organizedTasks.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {section.title} ({section.data.length})
              </ThemedText>
              {section.data.map(task => (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/tasks/${task.id}`)}
                >
                  <TaskCard task={task} onTaskComplete={handleTaskComplete} />
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => router.push('/tasks/create')}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      {showUndo && (
        <Animated.View style={styles.undoContainer}>
          <ThemedText>Task completed</ThemedText>
          <TouchableOpacity onPress={handleUndo}>
            <ThemedText style={styles.undoButton}>UNDO</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    bottom: + 16,
    right: 32,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  undoContainer: {
    position: 'absolute',
    bottom: 20, // Fixed by removing the undefined variable 'tabBarHeight'
    left: 20,
    right: 20,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  undoButton: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});
