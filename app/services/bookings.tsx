import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  serviceManagementService,
  MerchantServiceBooking,
  BookingStats,
  BookingStatus,
  CashbackStatus,
  Pagination,
} from '@/services/api/services';
import { Colors } from '@/constants/Colors';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';

const ACCENT = '#0EA5E9';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#F59E0B' },
  confirmed: { bg: '#D1FAE5', text: '#10B981' },
  assigned: { bg: '#DBEAFE', text: '#3B82F6' },
  in_progress: { bg: '#E0E7FF', text: '#6366F1' },
  completed: { bg: '#D1FAE5', text: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#EF4444' },
  no_show: { bg: '#F3F4F6', text: '#6B7280' },
};

const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#F59E0B' },
  paid: { bg: '#D1FAE5', text: '#10B981' },
  partial: { bg: '#FED7AA', text: '#EA580C' },
  refunded: { bg: '#E0E7FF', text: '#6366F1' },
  failed: { bg: '#FEE2E2', text: '#EF4444' },
};

const CASHBACK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#F59E0B' },
  held: { bg: '#DBEAFE', text: '#3B82F6' },
  credited: { bg: '#D1FAE5', text: '#10B981' },
  clawed_back: { bg: '#FEE2E2', text: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export default function ServiceBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<MerchantServiceBooking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

  // Action modal
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    booking: MerchantServiceBooking | null;
    action: 'confirmed' | 'completed' | 'cancelled' | null;
  }>({ visible: false, booking: null, action: null });
  const [actionNote, setActionNote] = useState('');

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Reload when tab changes
  useEffect(() => {
    loadBookings(1, false);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBookings(1, false), loadStats()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await serviceManagementService.getBookingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadBookings = async (page: number = 1, append: boolean = false) => {
    try {
      const params: any = { page, limit: 20 };
      if (activeTab !== 'all') params.status = activeTab as BookingStatus;

      const result = await serviceManagementService.getBookings(params);

      if (append) {
        setBookings(prev => [...prev, ...result.bookings]);
      } else {
        setBookings(result.bookings);
      }
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBookings(1, false), loadStats()]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !pagination || pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    await loadBookings(pagination.page + 1, true);
    setLoadingMore(false);
  };

  const handleUpdateStatus = async () => {
    const { booking, action } = actionModal;
    if (!booking || !action) return;

    setUpdatingBooking(booking._id);
    setActionModal({ visible: false, booking: null, action: null });

    try {
      await serviceManagementService.updateBookingStatus(booking._id, action, {
        note: actionNote.trim() || undefined,
      });
      setActionNote('');

      // Refresh data
      await Promise.all([loadBookings(1, false), loadStats()]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update booking status');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const getCustomerName = (booking: MerchantServiceBooking): string => {
    if (booking.customerName) return booking.customerName;
    const profile = booking.user?.profile;
    if (profile?.firstName) {
      return `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`;
    }
    return 'Unknown Customer';
  };

  const getCustomerPhone = (booking: MerchantServiceBooking): string => {
    return booking.customerPhone || booking.user?.profile?.phoneNumber || 'N/A';
  };

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // ── Stats Cards ─────────────────────────────────────────────────────────

  const renderStatsCards = () => {
    if (!stats) return null;

    const statItems = [
      { label: 'Total', value: stats.totalBookings, color: '#1F2937', bg: '#F3F4F6' },
      { label: 'Pending', value: stats.pending, color: '#F59E0B', bg: '#FEF3C7' },
      { label: 'Confirmed', value: stats.confirmed, color: '#10B981', bg: '#D1FAE5' },
      { label: 'Completed', value: stats.completed, color: '#059669', bg: '#D1FAE5' },
      { label: 'Cancelled', value: stats.cancelled, color: '#EF4444', bg: '#FEE2E2' },
      { label: 'Revenue', value: formatCurrency(stats.revenue), color: ACCENT, bg: '#F0F9FF' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        {statItems.map((item, idx) => (
          <View key={idx} style={[styles.statCard, { backgroundColor: item.bg }]}>
            <Text style={[styles.statValue, { color: item.color }]}>
              {typeof item.value === 'number' ? item.value : item.value}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ── Status Tabs ─────────────────────────────────────────────────────────

  const renderStatusTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsScroll}
    >
      {STATUS_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ── Status Badge ────────────────────────────────────────────────────────

  const StatusBadge = ({ status, colorMap }: { status: string; colorMap: Record<string, { bg: string; text: string }> }) => {
    const style = colorMap[status] || { bg: '#F3F4F6', text: '#6B7280' };
    const label = STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{label}</Text>
      </View>
    );
  };

  // ── Booking Card ────────────────────────────────────────────────────────

  const renderBookingCard = ({ item }: { item: MerchantServiceBooking }) => {
    const canConfirm = item.status === 'pending';
    const canComplete = item.status === 'confirmed';
    const canCancel = item.status === 'pending' || item.status === 'confirmed';
    const isUpdating = updatingBooking === item._id;

    return (
      <View style={styles.bookingCard}>
        {isUpdating && (
          <View style={styles.updatingOverlay}>
            <ActivityIndicator color={ACCENT} />
          </View>
        )}

        {/* Header: Booking number + Status */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingNumber}>#{item.bookingNumber}</Text>
            <Text style={styles.bookingDate}>
              {formatDate(item.bookingDate)}
              {item.timeSlot ? ` · ${item.timeSlot.start} - ${item.timeSlot.end}` : ''}
            </Text>
          </View>
          <StatusBadge status={item.status} colorMap={BOOKING_STATUS_COLORS} />
        </View>

        {/* Customer Info */}
        <View style={styles.cardSection}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color={ACCENT} />
            <Text style={styles.infoText}>{getCustomerName(item)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.infoTextSecondary}>{getCustomerPhone(item)}</Text>
          </View>
        </View>

        {/* Service + Category */}
        <View style={styles.cardSection}>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={16} color={ACCENT} />
            <Text style={styles.infoText} numberOfLines={1}>{item.service?.name || 'N/A'}</Text>
          </View>
          {item.serviceCategory?.name && (
            <View style={styles.infoRow}>
              <Ionicons name="folder-outline" size={16} color="#6B7280" />
              <Text style={styles.infoTextSecondary}>{item.serviceCategory.name}</Text>
            </View>
          )}
        </View>

        {/* Payment + Cashback Row */}
        <View style={styles.paymentRow}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Total</Text>
            <Text style={styles.paymentAmount}>{formatCurrency(item.pricing?.total || 0)}</Text>
          </View>
          <StatusBadge status={item.paymentStatus} colorMap={PAYMENT_STATUS_COLORS} />
          {item.cashbackStatus && (
            <View style={styles.cashbackBadge}>
              <Ionicons name="gift-outline" size={12} color={CASHBACK_STATUS_COLORS[item.cashbackStatus]?.text || '#6B7280'} />
              <Text style={[styles.badgeText, { color: CASHBACK_STATUS_COLORS[item.cashbackStatus]?.text || '#6B7280', marginLeft: 3 }]}>
                CB: {item.cashbackStatus.replace(/_/g, ' ')}
              </Text>
            </View>
          )}
        </View>

        {/* Travel Details (if present) */}
        {item.travelDetails?.route && (
          <View style={styles.travelSection}>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.routeText}>
                  {item.travelDetails.route.from}
                  {item.travelDetails.route.fromCode ? ` (${item.travelDetails.route.fromCode})` : ''}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#9CA3AF" style={{ marginHorizontal: 6 }} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.routeText}>
                  {item.travelDetails.route.to}
                  {item.travelDetails.route.toCode ? ` (${item.travelDetails.route.toCode})` : ''}
                </Text>
              </View>
            </View>
            {item.travelDetails.passengers && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text style={styles.infoTextSecondary}>
                  {item.travelDetails.passengers.adults} Adult{item.travelDetails.passengers.adults !== 1 ? 's' : ''}
                  {item.travelDetails.passengers.children ? `, ${item.travelDetails.passengers.children} Child` : ''}
                </Text>
              </View>
            )}
            {item.pnr && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                <Text style={styles.infoTextSecondary}>PNR: {item.pnr}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {(canConfirm || canComplete || canCancel) && (
          <View style={styles.actionsRow}>
            {canConfirm && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                onPress={() => setActionModal({ visible: true, booking: item, action: 'confirmed' })}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
                onPress={() => setActionModal({ visible: true, booking: item, action: 'completed' })}
              >
                <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => setActionModal({ visible: true, booking: item, action: 'cancelled' })}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── List Header ─────────────────────────────────────────────────────────

  const renderListHeader = () => (
    <View>
      {renderStatsCards()}
      {renderStatusTabs()}
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {pagination ? `${pagination.total} booking${pagination.total !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>
    </View>
  );

  // ── Empty State ─────────────────────────────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Bookings Found</Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'all'
            ? 'Bookings will appear here once customers start booking your services.'
            : `No ${activeTab} bookings at the moment.`}
        </Text>
      </View>
    );
  };

  // ── Footer ──────────────────────────────────────────────────────────────

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: BOTTOM_NAV_HEIGHT_CONSTANT + 20 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  };

  // ── Action Confirmation Modal ───────────────────────────────────────────

  const getActionConfig = () => {
    switch (actionModal.action) {
      case 'confirmed':
        return { title: 'Confirm Booking', color: '#10B981', label: 'Confirm', icon: 'checkmark-circle' as const };
      case 'completed':
        return { title: 'Complete Booking', color: '#6366F1', label: 'Complete', icon: 'checkbox' as const };
      case 'cancelled':
        return { title: 'Cancel Booking', color: '#EF4444', label: 'Cancel Booking', icon: 'close-circle' as const };
      default:
        return { title: '', color: '#6B7280', label: '', icon: 'help-circle' as const };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[ACCENT, '#0284C7', '#F3F4F6']}
        locations={[0, 0.15, 0.4]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Bookings</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.backButton}>
            <Ionicons name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item._id}
            renderItem={renderBookingCard}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      <BottomNav />

      {/* Action Confirmation Modal */}
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActionModal({ visible: false, booking: null, action: null });
          setActionNote('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {(() => {
              const config = getActionConfig();
              return (
                <>
                  <View style={[styles.modalIcon, { backgroundColor: `${config.color}15` }]}>
                    <Ionicons name={config.icon} size={32} color={config.color} />
                  </View>
                  <Text style={styles.modalTitle}>{config.title}</Text>
                  <Text style={styles.modalMessage}>
                    {actionModal.action === 'cancelled'
                      ? `Are you sure you want to cancel booking #${actionModal.booking?.bookingNumber}? This may trigger a refund.`
                      : `${config.label} booking #${actionModal.booking?.bookingNumber}?`}
                  </Text>

                  <TextInput
                    style={styles.noteInput}
                    value={actionNote}
                    onChangeText={setActionNote}
                    placeholder="Add a note (optional)"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => {
                        setActionModal({ visible: false, booking: null, action: null });
                        setActionNote('');
                      }}
                    >
                      <Text style={styles.modalCancelText}>Go Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, { backgroundColor: config.color }]}
                      onPress={handleUpdateStatus}
                    >
                      <Text style={styles.modalConfirmText}>{config.label}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 20,
  },

  // Stats
  statsScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  statCard: {
    width: 100,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },

  // Tabs
  tabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Result count
  resultCount: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultCountText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Booking Card
  bookingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  bookingDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Card sections
  cardSection: {
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  infoTextSecondary: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },

  // Payment row
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginBottom: 4,
  },
  paymentItem: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },

  // Travel section
  travelSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  noteInput: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
