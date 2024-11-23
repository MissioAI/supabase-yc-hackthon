import { StyleSheet, Platform } from 'react-native';
import { useState } from 'react';
import { Input } from '@rneui/themed';
import { ScrollView, Pressable } from 'react-native-gesture-handler';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
};

export default function SearchScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !user?.id) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .textSearch(
          'search_vector',
          query,
          {
            config: 'english',
            type: 'websearch'  // Allows for natural search syntax
          }
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={[styles.container, { marginBottom: tabBarHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={styles.title}>Search Tasks</ThemedText>

        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        {loading ? (
          <ThemedText>Searching...</ThemedText>
        ) : results.length > 0 ? (
          results.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push(`/search/${task.id}`)}
            >
              <ThemedView style={styles.taskItem}>
                <ThemedView style={styles.taskHeader}>
                  <ThemedText type="defaultSemiBold">{task.title}</ThemedText>
                  <ThemedView style={[styles.priorityBadge, styles[`priority${task.priority}`]]}>
                    <ThemedText style={styles.priorityText}>{task.priority}</ThemedText>
                  </ThemedView>
                </ThemedView>
                {task.description && (
                  <ThemedText style={styles.description}>{task.description}</ThemedText>
                )}
                <ThemedView style={styles.taskFooter}>
                  <ThemedText style={styles.status}>{task.status}</ThemedText>
                  {task.due_date && (
                    <ThemedText style={styles.dueDate}>
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </ThemedText>
                  )}
                </ThemedView>
              </ThemedView>
            </Pressable>
          ))
        ) : searchQuery ? (
          <ThemedText style={styles.noResults}>No tasks found</ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  taskItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
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
  status: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dueDate: {
    fontSize: 12,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
