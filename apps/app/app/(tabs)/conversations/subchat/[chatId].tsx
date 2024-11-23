import { useEffect, useState, useRef } from 'react';
import { StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';

type Chat = {
    id: string;
    name: string;
    created_at: string;
    is_hidden: boolean;
};

type Message = {
    id: string;
    chat_id: string;
    content: string;
    role: 'user' | 'assistant';
    created_at: string;
};

export default function SubChatScreen() {
    const { chatId } = useLocalSearchParams();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const fetchChat = async () => {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('id', chatId)
                .single();

            if (error) {
                console.error('Error fetching chat:', error);
                return;
            }

            setChat(data);
        };

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
                return;
            }

            setMessages(data || []);
        };

        // Set up realtime subscriptions
        const chatChannel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                    filter: `id=eq.${chatId}`
                },
                (payload) => {
                    setChat(payload.new as Chat);
                }
            )
            .subscribe();

        const messagesChannel = supabase
            .channel(`messages:${chatId}`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(current => [...current, payload.new as Message]);
                    }
                }
            )
            .subscribe();

        fetchChat();
        fetchMessages();

        return () => {
            supabase.removeChannel(chatChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, [chatId]);

    const handleSend = async () => {
        if (!inputMessage.trim()) return;

        try {
            const { error } = await supabase
                .from('messages')
                .insert([
                    {
                        chat_id: chatId,
                        content: inputMessage.trim(),
                        role: 'user'
                    }
                ]);

            if (error) throw error;
            setInputMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <ThemedView style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </Pressable>
                <ThemedText style={styles.title}>{chat?.name || 'Chat'}</ThemedText>
            </ThemedView>

            {/* Messages List */}
            <ScrollView
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesList}
            >
                {messages.map((message) => (
                    <ThemedView
                        key={message.id}
                        style={[
                            styles.messageContainer,
                            message.role === 'user' ? styles.userMessage : styles.assistantMessage
                        ]}
                    >
                        <ThemedText>{message.content}</ThemedText>
                    </ThemedView>
                ))}
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}
            >
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    placeholder="Type a message..."
                    placeholderTextColor="#666"
                    multiline
                />
                <Pressable
                    onPress={handleSend}
                    style={[
                        styles.sendButton,
                        !inputMessage.trim() && styles.sendButtonDisabled
                    ]}
                    disabled={!inputMessage.trim()}
                >
                    <IconSymbol
                        name="arrow.up.circle.fill"
                        size={32}
                        color={inputMessage.trim() ? "#007AFF" : "#666"}
                    />
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    messageContainer: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#007AFF',
    },
    assistantMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#E9E9EB',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: {
        padding: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    messagesContainer: {
        flex: 1,
    },
});