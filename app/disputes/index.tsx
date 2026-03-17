/**
 * Dispute Center — View and respond to customer disputes
 * Consumes existing backend: GET /api/merchant/disputes, POST /api/merchant/disputes/:id/respond
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  ActivityIndicator, Modal, TextInput, Platform, SafeAreaView, ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '@/services/api';
import { showAlert } from '@/utils/alert';

interface DisputeItem {
  _id: string;
  orderId?: { orderNumber?: string };
  amount?: number;
  reason?: string;
  description?: string;
  status: string;
  customerMessage?: string;
  merchantResponse?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: '#3B82F6', bg: '#EFF6FF', label: 'Open' },
  under_review: { color: '#F59E0B', bg: '#FEF3C7', label: 'Under Review' },
  merchant_responded: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Responded' },
  resolved: { color: '#10B981', bg: '#ECFDF5', label: 'Resolved' },
  closed: { color: '#6B7280', bg: '#F3F4F6', label: 'Closed' },
  escalated: { color: '#EF4444', bg: '#FEF2F2', label: 'Escalated' },
};

type StatusFilter = '' | 'open' | 'under_review' | 'resolved' | 'closed';

export default function DisputesScreen() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // Response modal
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDisputes = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) setIsLoading(true);
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiClient.get(`/merchant/disputes?${params.toString()}`);
      if (res.success) {
        const list = res.data?.disputes || res.data || [];
        setDisputes(prev => append ? [...prev, ...list] : list);
        setHasMore(res.data?.hasNextPage ?? list.length >= 20);
      }
    } catch {
      showAlert('Error', 'Failed to load disputes');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchDisputes(1); }, [fetchDisputes]);
  useEffect(() => { if (page > 1) fetchDisputes(page, true); }, [page]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchDisputes(1);
  }, [fetchDisputes]);

  const handleRespond = useCallback(async () => {
    if (!selectedDispute || !responseText.trim()) {
      showAlert('Error', 'Please enter a response');
      return;
    }
    if (responseText.length > 500) {
      showAlert('Error', 'Response must be 500 characters or less');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/merchant/disputes/${selectedDispute._id}/respond`, {
        message: responseText.trim(),
      });
      if (res.success) {
        showAlert('Response Submitted', 'Your response has been recorded.');
        setSelectedDispute(null);
        setResponseText('');
        onRefresh();
      } else {
        showAlert('Error', res.message || 'Failed to submit response');
      }
    } catch {
      showAlert('Error', 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDispute, responseText, onRefresh]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const renderDispute = useCallback(({ item }: { item: DisputeItem }) => {
    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
    const canRespond = item.status === 'open' || item.status === 'under_review';

    return (
      <Pressable style={styles.card} onPress={() => canRespond ? setSelectedDispute(item) : null}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>
              {item.orderId?.orderNumber ? `Order #${item.orderId.orderNumber}` : `Dispute #${item._id.slice(-6)}`}
            </Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
        </View>

        {item.amount != null && (
          <Text style={styles.amount}>Amount: ₹{item.amount.toLocaleString()}</Text>
        )}

        {item.reason && (
          <View style={styles.reasonRow}>
            <Ionicons name="flag-outline" size={14} color="#EF4444" />
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}

        {item.customerMessage && (
          <Text style={styles.message} numberOfLines={2}>{item.customerMessage}</Text>
        )}

        {item.merchantResponse && (
          <View style={styles.responsePreview}>
            <Ionicons name="chatbubble-outline" size={12} color="#7C3AED" />
            <Text style={styles.responsePreviewText} numberOfLines={1}>Your response: {item.merchantResponse}</Text>
          </View>
        )}

        {canRespond && !item.merchantResponse && (
          <View style={styles.respondCta}>
            <Ionicons name="create-outline" size={14} color="#7C3AED" />
            <Text style={styles.respondCtaText}>Tap to respond</Text>
          </View>
        )}
      </Pressable>
    );
  }, []);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Disputes' }} />

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => { setStatusFilter(f.key); setPage(1); setDisputes([]); }}
          >
            <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={disputes}
        keyExtractor={item => item._id}
        renderItem={renderDispute}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => hasMore && !isLoading && setPage(p => p + 1)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Disputes</Text>
              <Text style={styles.emptyText}>All clear! No disputes require your attention.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 20 }} color="#7C3AED" /> : null}
      />

      {/* Response Modal */}
      <Modal visible={!!selectedDispute} transparent animationType="slide" onRequestClose={() => setSelectedDispute(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Dispute</Text>
              <Pressable onPress={() => setSelectedDispute(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            {selectedDispute && (
              <ScrollView style={{ maxHeight: 300 }}>
                <Text style={styles.modalLabel}>Customer's Claim</Text>
                <Text style={styles.modalBody}>{selectedDispute.customerMessage || selectedDispute.description || 'No details provided'}</Text>

                {selectedDispute.reason && (
                  <>
                    <Text style={styles.modalLabel}>Reason</Text>
                    <Text style={styles.modalBody}>{selectedDispute.reason}</Text>
                  </>
                )}

                <Text style={styles.modalLabel}>Your Response (max 500 chars)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Explain your side of the situation..."
                  placeholderTextColor="#9CA3AF"
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{responseText.length}/500</Text>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setSelectedDispute(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleRespond}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Response</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  filterRow: { marginVertical: 10, maxHeight: 40 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  reasonText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  message: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  responsePreview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, backgroundColor: '#F5F3FF', borderRadius: 8 },
  responsePreviewText: { fontSize: 12, color: '#7C3AED', flex: 1 },
  respondCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  respondCtaText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 4 },
  modalBody: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 80, backgroundColor: '#FAFAFA' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
