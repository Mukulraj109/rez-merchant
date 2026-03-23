import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useStore } from '@/contexts/StoreContext';
import customerNotificationsService, {
  SentNotification,
} from '@/services/api/customerNotifications';

// ============================================
// TYPES
// ============================================

type TargetType = 'all' | 'recent' | 'loyal';

interface TargetOption {
  type: TargetType;
  label: string;
  description: string;
  icon: string;
}

const TARGET_OPTIONS: TargetOption[] = [
  { type: 'all', label: 'All Customers', description: 'Everyone who ordered from your store', icon: 'people' },
  { type: 'recent', label: 'Recent Visitors', description: 'Customers from the last 7 days', icon: 'time' },
  { type: 'loyal', label: 'Loyal Customers', description: 'Customers with 5+ orders', icon: 'heart' },
];

const MAX_TITLE_LENGTH = 50;
const MAX_BODY_LENGTH = 200;

// ============================================
// COMPONENT
// ============================================

export default function SendNotificationPage() {
  const { activeStore } = useStore();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [sending, setSending] = useState(false);

  // History state
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // Load sent history on mount
  useEffect(() => {
    if (activeStore?._id) {
      loadHistory(1, false);
    }
  }, [activeStore?._id]);

  const loadHistory = async (page: number, append: boolean) => {
    if (!activeStore?._id) return;
    setLoadingHistory(true);
    try {
      const response = await customerNotificationsService.getSentNotifications(
        activeStore._id,
        page,
        10
      );
      if (response.success && response.data) {
        const notifs = response.data.notifications || [];
        setSentNotifications(prev => append ? [...prev, ...notifs] : notifs);
        setHasMoreHistory(response.data.pagination?.hasNextPage || false);
        setHistoryPage(page);
      }
    } catch {
      // silently handle
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory(1, false);
    setRefreshing(false);
  };

  const handleSend = useCallback(async () => {
    if (!activeStore?._id) {
      Alert.alert('Error', 'No store selected. Please select a store first.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a notification title.');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a notification message.');
      return;
    }

    Alert.alert(
      'Confirm Send',
      `Send notification to ${TARGET_OPTIONS.find(t => t.type === targetType)?.label}?\n\nTitle: ${title}\nMessage: ${body}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              const response = await customerNotificationsService.sendNotification({
                title: title.trim(),
                body: body.trim(),
                targetType,
                storeId: activeStore._id,
              });

              if (response.success && response.data) {
                Alert.alert(
                  'Sent Successfully',
                  `Notification sent to ${response.data.targetCount} customers (${response.data.sent} push delivered).`
                );
                setTitle('');
                setBody('');
                // Refresh history
                loadHistory(1, false);
              } else {
                Alert.alert('Error', response.message || 'Failed to send notification.');
              }
            } catch (err: any) {
              const message = err?.response?.data?.message || 'Failed to send notification. Please try again.';
              Alert.alert('Error', message);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }, [activeStore?._id, title, body, targetType]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && activeStore?._id;

  // ============================================
  // RENDER
  // ============================================

  const renderHistoryItem = ({ item }: { item: SentNotification }) => {
    const date = new Date(item.sentAt);
    const timeStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyIcon}>
          <Ionicons name="notifications-outline" size={18} color="#7C3AED" />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.historyBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.historyDate}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <LinearGradient
          colors={['#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="megaphone-outline" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Send Notification</Text>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Notification Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Compose Notification</Text>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, MAX_TITLE_LENGTH))}
                placeholder="e.g., Weekend Special Offer!"
                placeholderTextColor="#9CA3AF"
                maxLength={MAX_TITLE_LENGTH}
              />
              <Text style={styles.charCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
            </View>

            {/* Body Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={body}
                onChangeText={(t) => setBody(t.slice(0, MAX_BODY_LENGTH))}
                placeholder="e.g., Get 20% off on all items this weekend. Visit us today!"
                placeholderTextColor="#9CA3AF"
                maxLength={MAX_BODY_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{body.length}/{MAX_BODY_LENGTH}</Text>
            </View>

            {/* Target Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Send To</Text>
              {TARGET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.targetOption,
                    targetType === option.type && styles.targetOptionActive,
                  ]}
                  onPress={() => setTargetType(option.type)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.targetIconContainer,
                    targetType === option.type && styles.targetIconActive,
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={targetType === option.type ? '#fff' : '#7C3AED'}
                    />
                  </View>
                  <View style={styles.targetText}>
                    <Text style={[
                      styles.targetLabel,
                      targetType === option.type && styles.targetLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.targetDescription}>{option.description}</Text>
                  </View>
                  {targetType === option.type && (
                    <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview Card */}
          {title.trim() || body.trim() ? (
            <View style={styles.previewCard}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewNotification}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewAppIcon}>
                    <Ionicons name="storefront" size={16} color="#7C3AED" />
                  </View>
                  <Text style={styles.previewAppName}>{activeStore?.name || 'Your Store'}</Text>
                  <Text style={styles.previewTime}>now</Text>
                </View>
                <Text style={styles.previewTitle}>{title || 'Notification Title'}</Text>
                <Text style={styles.previewBody} numberOfLines={3}>
                  {body || 'Notification message will appear here...'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canSend ? ['#7C3AED', '#6366F1'] : ['#D1D5DB', '#D1D5DB']}
              style={styles.sendButtonGradient}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Notification</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sent History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Sent History</Text>
            {loadingHistory && sentNotifications.length === 0 ? (
              <ActivityIndicator color="#7C3AED" style={{ padding: 20 }} />
            ) : sentNotifications.length === 0 ? (
              <View style={styles.emptyHistory}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="notifications-off-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No notifications sent yet</Text>
                <Text style={styles.emptySubtitle}>Send your first notification to engage customers</Text>
              </View>
            ) : (
              <>
                {sentNotifications.map((item, index) => (
                  <View key={`${item.title}-${item.sentAt}-${index}`}>
                    {renderHistoryItem({ item })}
                  </View>
                ))}
                {hasMoreHistory && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => loadHistory(historyPage + 1, true)}
                  >
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    margin: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    gap: 12,
  },
  targetOptionActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  targetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetIconActive: {
    backgroundColor: '#7C3AED',
  },
  targetText: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  targetLabelActive: {
    color: '#7C3AED',
  },
  targetDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  previewNotification: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewAppIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAppName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  previewTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  sendButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  historySection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyBody: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  historyDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
