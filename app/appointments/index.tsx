import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showAlert, showConfirm } from '@/utils/alert';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentService, ServiceAppointment } from '@/services/api/appointments';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  in_progress: '#8B5CF6',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Use merchant's first store ID
  const storeId = (user as any)?.storeId || (user as any)?.stores?.[0]?._id || '';

  const fetchAppointments = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!storeId) return;
    try {
      if (pageNum === 1 && !append) setLoading(true);
      const result = await appointmentService.getStoreAppointments(storeId, {
        page: pageNum,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        date: selectedDate || undefined,
      });

      const items = result.appointments ?? [];
      setAppointments(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch {
      if (!append) setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [storeId, statusFilter, selectedDate]);

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments(1);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchAppointments(page + 1, true);
  };

  const handleUpdateStatus = (appointment: ServiceAppointment, newStatus: 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    const label = STATUS_LABELS[newStatus];
    const isDestructive = newStatus === 'cancelled';

    showConfirm(
      `${label} Appointment`,
      `Mark appointment #${appointment.appointmentNumber} as ${label.toLowerCase()}?`,
      async () => {
        setUpdatingId(appointment._id);
        try {
          await appointmentService.updateStatus(appointment._id, newStatus);
          setAppointments(prev =>
            prev.map(a => a._id === appointment._id ? { ...a, status: newStatus } : a)
          );
          showAlert('Success', `Appointment marked as ${label.toLowerCase()}`);
        } catch (error: any) {
          showAlert('Error', error.message || `Failed to update appointment`);
        } finally {
          setUpdatingId(null);
        }
      }
    );
  };

  const getActionButtons = (appointment: ServiceAppointment) => {
    switch (appointment.status) {
      case 'pending':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleUpdateStatus(appointment, 'confirmed')}
              disabled={updatingId === appointment._id}
            >
              <ThemedText style={styles.actionBtnText}>Confirm</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => handleUpdateStatus(appointment, 'cancelled')}
              disabled={updatingId === appointment._id}
            >
              <ThemedText style={styles.actionBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        );
      case 'confirmed':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => handleUpdateStatus(appointment, 'in_progress')}
              disabled={updatingId === appointment._id}
            >
              <ThemedText style={styles.actionBtnText}>Start</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => handleUpdateStatus(appointment, 'cancelled')}
              disabled={updatingId === appointment._id}
            >
              <ThemedText style={styles.actionBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        );
      case 'in_progress':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() => handleUpdateStatus(appointment, 'completed')}
            disabled={updatingId === appointment._id}
          >
            <ThemedText style={styles.actionBtnText}>Complete</ThemedText>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderAppointment = ({ item }: { item: ServiceAppointment }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const isUpdating = updatingId === item._id;

    return (
      <View style={styles.card}>
        {isUpdating && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <ThemedText style={styles.appointmentNumber}>
              #{item.appointmentNumber}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <ThemedText style={styles.statusText}>
                {STATUS_LABELS[item.status] || item.status}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.serviceType}>{item.serviceType}</ThemedText>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.infoText}>{item.customerName}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.infoText}>{item.customerPhone}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.infoText}>
              {new Date(item.appointmentDate).toLocaleDateString()} at {item.appointmentTime}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.infoText}>{item.duration} min</ThemedText>
          </View>
          {item.staffMember && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={Colors.light.textSecondary} />
              <ThemedText style={styles.infoText}>Staff: {item.staffMember}</ThemedText>
            </View>
          )}
          {item.specialInstructions && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={16} color={Colors.light.textSecondary} />
              <ThemedText style={styles.infoText} numberOfLines={2}>{item.specialInstructions}</ThemedText>
            </View>
          )}
        </View>

        {getActionButtons(item)}
      </View>
    );
  };

  const FILTERS: StatusFilter[] = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Appointments</ThemedText>
        <View style={{ width: 32 }} />
      </View>

      {/* Status Filters */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <ThemedText style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {STATUS_LABELS[f] || 'All'}
            </ThemedText>
          </TouchableOpacity>
        )}
      />

      {/* Appointments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={item => item._id}
          contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={Colors.light.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Appointments</ThemedText>
              <ThemedText style={styles.emptyText}>
                Service appointments will appear here when customers book.
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={Colors.light.primary} style={{ padding: 16 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: { padding: 4 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  filterTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 120 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appointmentNumber: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'uppercase' },
  serviceType: { fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: Colors.light.text, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginTop: 16 },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
});
