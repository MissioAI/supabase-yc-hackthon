import React, { useState, useRef, useEffect } from "react";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import * as FileSystem from "expo-file-system";
import {
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { InputTextContentType } from "@openai/realtime-api-beta/dist/lib/client";
import { Buffer } from "buffer"; // Import Buffer
import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from "expo-av/build/Audio";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { randomUUID } from "expo-crypto";

// Ensure Buffer is available globally
global.Buffer = global.Buffer || Buffer;

// Message type definition - keep it the same as before
type Message = {
  role: "user" | "assistant";
  content: string;
};

// Add a discriminator to identify tool messages
type ToolMessage = Message & {
  isToolMessage: true;  // This helps TypeScript distinguish tool messages
};

type TaskParams = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
};

// Replace 'YOUR_API_KEY_HERE' with your actual OpenAI API key, but keep it secure
const client = new RealtimeClient({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export default function ChatScreen() {
  const { user } = useAuth();
  const [chatId] = useState(() => randomUUID());
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. How can I help you today?\n\nTip: Use '/task [title]' to create a new task.",
    },
  ]);
  const [toolMessages, setToolMessages] = useState<ToolMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabBarHeight = useBottomTabBarHeight();

  // State variables for assistant audio playback
  const [assistantAudioChunks, setAssistantAudioChunks] = useState<Buffer[]>(
    []
  );
  const assistantSoundRef = useRef<Audio.Sound | null>(null);

  // Add this near your other state declarations (around line 68)
  const toolsInitialized = useRef(false);
  // Initialize client connection and tools
  useEffect(() => {
    const initializeClient = async () => {
      try {
        await client.connect();
        console.log("🟢 Connected to Realtime API");

        // Only add tools if they haven't been initialized yet
        if (!toolsInitialized.current) {
          // Add task creation tool
          client.addTool(
            {
              name: "create_task",
              description: "Creates a new task in the user's task list",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the task",
                  },
                  description: {
                    type: "string",
                    description: "Optional description of the task",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Priority level of the task",
                  },
                  due_date: {
                    type: "string",
                    format: "date-time",
                    description: "Optional due date for the task (ISO string)",
                  },
                },
                required: ["title"],
              },
            },
            async (params: TaskParams) => {
              if (!user?.id) throw new Error("User not authenticated");

              try {
                const { error } = await supabase.from("tasks").insert([
                  {
                    user_id: user.id,
                    title: params.title.trim(),
                    description: params.description?.trim() || "",
                  },
                ]);

                if (error) throw error;

                // Add tool message with the discriminator
                setToolMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `🛠️ Task created: "${params.title}"`,
                    isToolMessage: true,
                  },
                ]);

                // Call the computer-use endpoint after successful task creation
                try {
                  debugger;

                  // Updated confirmation message with tool icon
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content: `🛠️ Task created: "${params.title}"`,
                    },
                  ]);

                  debugger

                  //    const response = await fetch(`http://172.20.10.3:3000/api/computer-use?chatId=${chatId}`, {
                  //         method: 'POST',
                  //         headers: {
                  //             'Content-Type': 'application/json',
                  //         },
                  //         body: JSON.stringify({
                  //             messages: [
                  //                 {
                  //                     role: 'user',
                  //                     content: params.title // Using the task title as the prompt
                  //                 }
                  //             ]
                  //         })
                  //     });

                  //     const data = await response.json();

                  const data = null;

                  if (data) {
                    // Send the computer-use response to the assistant
                    client.sendUserMessageContent([
                      {
                        type: "input_text",
                        text: `Computer Analysis: ${data}`,
                      },
                    ] as InputTextContentType[]);
                    console.log(
                      "🟢 Sent computer-use response to assistant",
                      data
                    );
                    await client.createResponse();
                  }
                } catch (endpointError) {
                  console.error(
                    "Error calling computer-use endpoint:",
                    endpointError
                  );
                  // Continue with task creation success even if endpoint fails
                }

                return {
                  success: true,
                  message: `Task "${params.title}" created successfully`,
                };
              } catch (error) {
                console.error("Error creating task:", error);
                throw new Error("Failed to create task");
              }
            }
          );

          // Mark tools as initialized
          toolsInitialized.current = true;
        }

        // Update session with instructions
        client.updateSession({
          instructions: `You are a helpful assistant who's sole purpose in life is to can create tasks in the user's task list. When a user asks to create a task, remember or schedule something, always use the create_task tool to help them.`,
          modalities: ["text", "audio"],
          voice: "ash",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
        });

        // Handle transcription updates
        client.on("conversation.item.created", ({ item }: { item: any }) => {
          console.log("📝 Message Created:", {
            role: item.role,
            type: item.type,
            text: item.formatted?.text,
            transcript: item.formatted?.transcript,
          });

          if (item.type === "message") {
            if (item.role === "user" && item.formatted?.transcript) {
              // Update the user message with the transcription
              setMessages((prev) => {
                const newMessages = [...prev];
                const userMessageIndex = newMessages.findIndex(
                  (msg) =>
                    msg.role === "user" &&
                    msg.content === "🎤 Transcribing audio..."
                );
                if (userMessageIndex !== -1) {
                  newMessages[userMessageIndex].content =
                    item.formatted.transcript;
                }
                return newMessages;
              });
            } else if (item.role === "assistant") {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === "assistant") {
                  lastMessage.content =
                    item.formatted?.text || item.formatted?.transcript || "";
                } else {
                  // Add a new assistant message
                  newMessages.push({
                    role: "assistant",
                    content:
                      item.formatted?.text || item.formatted?.transcript || "",
                  });
                }
                return newMessages;
              });
            }
          }
        });

        client.on(
          "conversation.updated",
          ({ item, delta }: { item: any; delta: any }) => {
            if (delta?.audio) {
              // Decode base64-encoded audio chunk into binary data
              const audioChunkData = Buffer.from(delta.audio, "base64");
              // console.log('Received audio chunk of length:', audioChunkData.length);
              setAssistantAudioChunks((prevChunks) => [
                ...prevChunks,
                audioChunkData,
              ]);
            }

            // Update assistant's text content as it streams in
            if (item.role === "assistant") {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === "assistant") {
                  lastMessage.content =
                    item.formatted?.transcript || item.formatted?.text || "";
                }
                return newMessages;
              });
            }

            // When assistant's response is completed, assemble and play audio
            if (
              item.status === "completed" &&
              assistantAudioChunks.length > 0
            ) {
              assembleAndPlayAssistantAudio();
              // Reset the collected audio chunks
              setAssistantAudioChunks([]);
            }
          }
        );

        client.on("error", (error: any) => {
          console.error("❌ Realtime API error:", error);
          setError("An error occurred with the chat service.");
        });

        setError(null);
      } catch (error) {
        console.error("Failed to connect to Realtime API:", error);
        setError("Failed to connect to chat service. Please try again later.");
      }
    };

    initializeClient();

    return () => {
      client.disconnect();
      if (assistantSoundRef.current) {
        assistantSoundRef.current.unloadAsync();
      }
      toolsInitialized.current = false;
    };
  }, [user?.id]);

  // Initialize audio recording
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Request permissions first
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error("Audio recording permission not granted");
        }

        // Configure audio mode with proper settings
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        setError(
          "Failed to initialize audio recording. Please check permissions."
        );
      }
    };

    initAudio();

    // Cleanup function
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const sendMessage = async (audioBuffer?: ArrayBuffer) => {
    if ((!inputText.trim() && !audioBuffer) || isLoading) return;

    setIsLoading(true);

    try {
      // Check for task creation command
      if (inputText.toLowerCase().startsWith("/task ")) {
        const taskContent = inputText.slice(6).trim(); // Remove '/task ' prefix
        if (taskContent) {
          await createTask(taskContent);
          setInputText("");
          setIsLoading(false);
          return;
        }
      }

      if (audioBuffer) {
        // First, append the audio buffer
        const int16Audio = new Int16Array(audioBuffer);
        client.appendInputAudio(int16Audio);

        // Add a temporary user message
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: "🎤 Transcribing audio...",
          },
        ]);

        // Add empty assistant message for upcoming response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
          },
        ]);

        // Create the response
        await client.createResponse();
      } else {
        // Handle text messages
        const userMessage = { role: "user", content: inputText.trim() };
        const content = [
          {
            type: "input_text",
            text: userMessage.content,
          },
        ];

        setMessages((prev) => [...prev, userMessage as Message]);
        setInputText("");

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        // Send the text message
        client.sendUserMessageContent(content as InputTextContentType[]);
        await client.createResponse();
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check for audio recording permissions
  const checkPermissions = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Please grant microphone permissions to use this feature.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      setError("Failed to request microphone permissions.");
      return false;
    }
  };

  const startRecording = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      // Ensure proper audio mode is set before recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Create and prepare the recording with all required properties
      const { recording: newRecording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: ".wav",
          outputFormat: AndroidOutputFormat.DEFAULT,
          audioEncoder: AndroidAudioEncoder.DEFAULT,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: IOSOutputFormat.LINEARPCM,
          audioQuality: IOSAudioQuality.MAX,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);

      if (uri) {
        // Get the audio file info
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) throw new Error("Recording file not found");

        // Read the file directly as binary data
        const audioData = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Decode base64 to binary
        const audioBytes = Buffer.from(audioData, "base64");

        // Send audio
        await sendMessage(audioBytes.buffer);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setError("Failed to process audio recording.");
    }

    setRecording(null);
  };

  // Assemble and play the assistant's audio response
  const assembleAndPlayAssistantAudio = async () => {
    try {
      // Combine all binary audio chunks
      const combinedAudioData = Buffer.concat(assistantAudioChunks);
      console.log(
        "Total combined audio data length:",
        combinedAudioData.length
      );

      // Create WAV file from PCM data
      const wavBuffer = createWavFileFromPCMData(combinedAudioData, 24000);
      console.log("WAV buffer size:", wavBuffer.length);

      // Write the WAV data to a file
      const wavFileUri = FileSystem.cacheDirectory + "assistant_response.wav";
      await FileSystem.writeAsStringAsync(
        wavFileUri,
        wavBuffer.toString("base64"),
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      // Verify that the file exists
      const fileInfo = await FileSystem.getInfoAsync(wavFileUri);
      if (fileInfo.exists) {
        console.log("WAV file written successfully:", wavFileUri);
        console.log("WAV file size:", fileInfo.size);
      } else {
        console.error("Failed to write WAV file");
      }

      // Release any previously loaded sound
      if (assistantSoundRef.current) {
        await assistantSoundRef.current.unloadAsync();
        assistantSoundRef.current = null;
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: wavFileUri },
        { shouldPlay: true }
      );
      assistantSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          assistantSoundRef.current = null;
        }
      });
    } catch (error) {
      console.error("Error in assembleAndPlayAssistantAudio:", error);
      setError("Failed to play assistant audio.");
    }
  };

  // Helper function to create WAV file from PCM data
  function createWavFileFromPCMData(pcmData: Buffer, sampleRate: number) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;

    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // 'RIFF' chunk descriptor
    buffer.write("RIFF", offset);
    offset += 4;
    buffer.writeUInt32LE(36 + dataSize, offset);
    offset += 4;
    buffer.write("WAVE", offset);
    offset += 4;

    // 'fmt ' sub-chunk
    buffer.write("fmt ", offset);
    offset += 4;
    buffer.writeUInt32LE(16, offset);
    offset += 4;
    buffer.writeUInt16LE(1, offset);
    offset += 2;
    buffer.writeUInt16LE(numChannels, offset);
    offset += 2;
    buffer.writeUInt32LE(sampleRate, offset);
    offset += 4;
    buffer.writeUInt32LE(byteRate, offset);
    offset += 4;
    buffer.writeUInt16LE(blockAlign, offset);
    offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset);
    offset += 2;

    // 'data' sub-chunk
    buffer.write("data", offset);
    offset += 4;
    buffer.writeUInt32LE(dataSize, offset);
    offset += 4;

    // PCM data
    pcmData.copy(buffer, offset);

    return buffer;
  }

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (assistantSoundRef.current) {
        assistantSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const createTask = async (title: string, description?: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("tasks").insert([
        {
          user_id: user.id,
          title: title.trim(),
          description: description?.trim() || "",
          priority: "medium",
          status: "pending",
          due_date: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error("Error creating task:", error);
      setError("Failed to create task. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { marginBottom: tabBarHeight }]}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {error && (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          )}
          {messages.length === 0 && toolMessages.length === 0 ? (
            <ThemedView style={styles.emptyStateContainer}>
              <ThemedText style={styles.emptyStateText}>
                Start a conversation by typing a message below
              </ThemedText>
            </ThemedView>
          ) : (
            messages.reduce((acc: (Message | ToolMessage)[], message, index) => {
              // Add the current message
              acc.push(message);
              
              // If this is a user message, check for any tool messages that should follow it
              if (message.role === "user") {
                const toolMessagesForUser = toolMessages.filter((_, toolIndex) => 
                  // Match tool messages to the previous user message
                  Math.floor(toolIndex / 2) === Math.floor(index / 2)
                );
                acc.push(...toolMessagesForUser);
              }
              
              return acc;
            }, []).map((message, index) => (
              <ThemedView
                key={index}
                style={[
                  styles.messageBubble,
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage,
                  'isToolMessage' in message && styles.toolMessage,
                ]}
              >
                <ThemedText>{message.content}</ThemedText>
              </ThemedView>
            ))
          )}
          {isLoading && (
            <ThemedText style={styles.loadingText}>AI is typing...</ThemedText>
          )}
        </ScrollView>

        <ThemedView
          style={[
            styles.inputContainer,
            { marginBottom: Platform.OS === "ios" ? 0 : tabBarHeight },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
          />
          <Pressable
            onPress={() => sendMessage()}
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.disabledButton,
            ]}
            disabled={!inputText.trim() || isLoading}
          >
            <ThemedText style={styles.sendButtonText}>Send</ThemedText>
          </Pressable>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            style={[styles.micButton, isRecording && styles.recordingButton]}
          >
            <ThemedText style={styles.micButtonText}>🎤</ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    gap: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "80%",
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#0a7ea4",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
  },
  loadingText: {
    alignSelf: "center",
    color: "#666",
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    padding: 12,
    paddingTop: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  micButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a7ea4",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  recordingButton: {
    backgroundColor: "#ff3b30",
  },
  micButtonText: {
    color: "#fff",
    fontSize: 24,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#c62828",
    textAlign: "center",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    color: "#666",
    textAlign: "center",
    fontSize: 16,
  },
  toolMessage: {
    backgroundColor: '#e3f2fd',  // Light blue background
    borderWidth: 1,
    borderColor: '#90caf9',
  },
});
