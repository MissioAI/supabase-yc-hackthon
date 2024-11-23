import { Image, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TaskCard from '@/components/TaskCard';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionRate, setCompletionRate] = useState(0);

  const fetchTodayTasks = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', today.toISOString())
        .lt('due_date', new Date(today.getTime() + 86400000).toISOString())
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTodayTasks(data?.slice(0, 3) || []);

      // Calculate completion rate using all tasks
      if (data && data.length > 0) {
        const completedTasks = data.filter(task => task.status === 'completed').length;
        setCompletionRate(Math.round((completedTasks / data.length) * 100));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks();

    let channel: RealtimeChannel;

    if (user?.id) {
      // Subscribe to realtime changes
      channel = supabase
        .channel('today_tasks_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${user.id}`
          },
          (payload: RealtimePostgresChangesPayload<{
            [key: string]: any;
            new: Task;
            old: Task;
          }>) => {
            console.log('Realtime change received:', payload);

            // Get today's date range for filtering
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today.getTime() + 86400000);

            const task = payload.new as Task;
            const isTaskForToday = task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) < tomorrow;
            switch (payload.eventType) {
              case 'INSERT':
                if (isTaskForToday) {
                  fetchTodayTasks();
                }
                break;
              case 'UPDATE':
                if (isTaskForToday || (payload.old?.status !== 'completed' && payload.new?.status === 'completed')) {
                  fetchTodayTasks();
                }
                break;
              case 'DELETE':
                fetchTodayTasks();
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

  const handleTaskComplete = (taskId: string) => {
    // The realtime subscription will handle the update
  };

  return (
    <ThemedView style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
          {/* Header Section */}
          <ThemedView style={styles.header}>
            <View style={styles.headerLeft}>
              <ThemedText type="title">Hey, {user?.user_metadata?.name} 👋</ThemedText>
              <ThemedText style={styles.subtitle}>
                There are {todayTasks.length} Tasks to complete today
              </ThemedText>
            </View>
            <View style={styles.progressCircle}>
              <ThemedText type="title">{completionRate}%</ThemedText>
            </View>
          </ThemedView>

          {/* Workspace Buttons */}
          <View style={styles.tabContainer}>
            <ThemedText style={[styles.tab, styles.activeTab]}>My Tasks</ThemedText>
            <ThemedText style={styles.tab}>Projects</ThemedText>
            <ThemedText style={styles.tab}>Team</ThemedText>
          </View>

          {/* Project Card */}
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTime}>9:00 AM - 10:00 AM</ThemedText>
            <ThemedText style={styles.cardTitle}>Team Meeting</ThemedText>
            <ThemedText style={styles.cardDate}>Today, 19 Dec</ThemedText>
            <View style={styles.projectStats}>
              {/* Add your project stats here */}
            </View>
            <ThemedText style={styles.cardDescription}>
              Weekly team sync to discuss project progress and blockers
            </ThemedText>
            <View style={styles.cardFooter}>
              <View style={styles.avatarGroup}>
                {/* Add your avatars here */}
              </View>
              <View style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>In Progress</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Today's Tasks Section */}
          <View style={styles.todaySection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Today's Tasks</ThemedText>
              <Pressable onPress={() => router.push('/tasks')}>
                <ThemedText style={styles.viewAll}>View All</ThemedText>
              </Pressable>
            </View>

            {loading ? (
              <ThemedText>Loading tasks...</ThemedText>
            ) : todayTasks.length === 0 ? (
              <ThemedText>No tasks for today</ThemedText>
            ) : (
              <View style={styles.tasksList}>
                {todayTasks.map(task => (
                  <Pressable
                    key={task.id}
                    onPress={() => router.push(`/tasks/${task.id}`)}
                    style={styles.taskItem}
                  >
                    <TaskCard task={task} onTaskComplete={handleTaskComplete} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  tab: {
    opacity: 0.5,
  },
  activeTab: {
    color: '#2379e3',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#2379e3',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardTime: {
    color: '#fff',
    opacity: 0.8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDate: {
    color: '#fff',
    opacity: 0.7,
  },
  projectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#fff',
    opacity: 0.8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  avatarGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  statusText: {
    color: '#2379e3',
    fontWeight: 'bold',
  },
  todaySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    marginBottom: 4,
  },
  viewAll: {
    color: '#2379e3',
    fontWeight: 'bold',
  },
});
