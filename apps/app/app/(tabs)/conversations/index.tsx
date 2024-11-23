import { StyleSheet, View, Pressable, FlatList, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Conversation = {
    id: string;
    title: string;
    last_message: string;
    created_at: string;
};

export default function ChatsScreen() {
    const { user } = useAuth();
    const [conversations, setChats] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const tabBarHeight = useBottomTabBarHeight();

    useEffect(() => {
        if (user) {
            loadChats();
        }
    }, [user]);

    const handleCreateChat = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('conversations')
                .insert([
                    {
                        user_id: user.id,
                        title: 'New Conversation',
                        last_message: 'Conversation created',
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Navigate directly to the new conversation
            router.push(`/conversations/${data.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    };

    const loadChats = async () => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadChats();
        setRefreshing(false);
    };

    const renderChatItem = ({ item }: { item: Conversation }) => (
        <Pressable
            style={styles.chatItem}
            onPress={() => router.push(`/conversations/${item.id}`)}
        >
            <View style={styles.chatIcon}>
                <IconSymbol name="message.fill" size={24} color="#0a7ea4" />
            </View>
            <View style={styles.chatInfo}>
                <ThemedText style={styles.chatTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.lastMessage}>{item.last_message}</ThemedText>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
            <ThemedView style={[styles.container, { marginBottom: tabBarHeight }]}>
                <ThemedText type="title" style={styles.header}>Conversations</ThemedText>

                {loading ? (
                    <ThemedText>Loading conversations...</ThemedText>
                ) : conversations.length === 0 ? (
                    <ThemedView style={styles.emptyState}>
                        <ThemedText style={styles.emptyStateText}>
                            No conversations yet. Start a new conversation!
                        </ThemedText>
                    </ThemedView>
                ) : (
                    <FlatList
                        data={conversations}
                        renderItem={renderChatItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.chatList}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                    />
                )}

                <Pressable
                    style={styles.fab}
                    onPress={handleCreateChat}
                >
                    <IconSymbol name="plus" size={24} color="#FFFFFF" />
                </Pressable>
            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    chatList: {
        gap: 12,
    },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        alignItems: 'center',
    },
    chatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        textAlign: 'center',
        color: '#666',
    },
    fab: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0a7ea4',
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
});