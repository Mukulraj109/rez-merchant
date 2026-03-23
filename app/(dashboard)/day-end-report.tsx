import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/contexts/StoreContext';
import { Colors } from '@/constants/Colors';
import { showAlert } from '@/utils/alert';
import { buildApiUrl } from '@/config/api';
import { storageService } from '@/services/storage';

// ─── Types ────────────────────────────────────────────────────────────────

interface DayEndMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  totalOrders: number;
  monthlyOrders: number;
  ordersGrowth: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  monthlyCustomers: number;
  customerGrowth: number;
  returningCustomers: number;
  totalCashbackPaid: number;
  monthlyCashbackPaid: number;
  pendingCashback: number;
  cashbackROI: number;
  profitMargin: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    totalSold: number;
    revenue: number;
  }>;
}

interface RevenueBreakdown {
  cash: number;
  upi: number;
  card: number;
  wallet: number;
  other: number;
  total: number;
}

interface DayEndData {
  metrics: DayEndMetrics | null;
  revenueBreakdown: RevenueBreakdown;
  coinsRedeemed: number;
  newCustomers: number;
  returningCustomers: number;
  platformCommission: number;
  netRevenue: number;
  cashbackDistributed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateParam = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── Component ────────────────────────────────────────────────────────────

export default function DayEndReportScreen() {
  const { activeStore, stores } = useStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [data, setData] = useState<DayEndData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Quick date options for the date picker modal
  const dateOptions = useMemo(() => {
    const options: { label: string; date: Date }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      options.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : formatDate(d),
        date: d,
      });
    }
    return options;
  }, []);

  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  // ─── Fetch data ───────────────────────────────────────────────────────

  const fetchReport = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) setRefreshing(true);
        else setIsLoading(true);

        const storeId = activeStore?._id;
        const token = (await storageService.getAuthToken()) || '';

        // Build the URL -- the backend GET /api/merchant/dashboard returns
        // comprehensive metrics. We pass period=1 for today's data.
        const params = new URLSearchParams();
        if (storeId) params.append('storeId', storeId);
        params.append('period', '1');
        params.append('date', formatDateParam(selectedDate));

        const dashboardUrl = buildApiUrl(`merchant/dashboard?${params.toString()}`);

        const response = await fetch(dashboardUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        if (!json.success || !json.data) {
          throw new Error(json.message || 'Failed to load report');
        }

        const raw = json.data;

        // Extract metrics -- the backend wraps some values as objects { value, change, trend, period }
        const extractValue = (v: any): number => {
          if (v == null) return 0;
          if (typeof v === 'object' && 'value' in v) return v.value ?? 0;
          return typeof v === 'number' ? v : 0;
        };

        const m = raw.metrics || raw;

        const metrics: DayEndMetrics = {
          totalRevenue: extractValue(m.totalRevenue),
          monthlyRevenue: m.monthlyRevenue ?? 0,
          revenueGrowth: typeof m.totalRevenue === 'object' ? (m.totalRevenue.change ?? 0) : (m.revenueGrowth ?? 0),
          averageOrderValue: m.averageOrderValue ?? 0,
          totalOrders: extractValue(m.totalOrders),
          monthlyOrders: m.monthlyOrders ?? 0,
          ordersGrowth: typeof m.totalOrders === 'object' ? (m.totalOrders.change ?? 0) : (m.ordersGrowth ?? 0),
          pendingOrders: m.pendingOrders ?? 0,
          completedOrders: m.completedOrders ?? 0,
          cancelledOrders: m.cancelledOrders ?? 0,
          totalProducts: extractValue(m.totalProducts),
          activeProducts: m.activeProducts ?? 0,
          lowStockProducts: m.lowStockProducts ?? 0,
          totalCustomers: extractValue(m.totalCustomers),
          monthlyCustomers: m.monthlyCustomers ?? 0,
          customerGrowth: typeof m.totalCustomers === 'object' ? (m.totalCustomers.change ?? 0) : (m.customerGrowth ?? 0),
          returningCustomers: m.returningCustomers ?? 0,
          totalCashbackPaid: m.totalCashbackPaid ?? 0,
          monthlyCashbackPaid: m.monthlyCashbackPaid ?? 0,
          pendingCashback: m.pendingCashback ?? 0,
          cashbackROI: m.cashbackROI ?? 0,
          profitMargin: m.profitMargin ?? 0,
          topSellingProducts: m.topSellingProducts || (raw.topProducts || []).map((p: any) => ({
            productId: p.id || p.productId || '',
            name: p.name || 'Unknown',
            totalSold: p.sales ?? p.totalSold ?? 0,
            revenue: p.revenue ?? 0,
          })),
        };

        // Revenue breakdown by payment method (from top-level if available, else estimate from total)
        const rb = raw.revenueBreakdown || {};
        const revenueBreakdown: RevenueBreakdown = {
          cash: rb.cash ?? 0,
          upi: rb.upi ?? 0,
          card: rb.card ?? 0,
          wallet: rb.wallet ?? rb.coinOnly ?? 0,
          other: rb.other ?? rb.netbanking ?? 0,
          total: metrics.totalRevenue,
        };

        // If no breakdown detail, set total to the sum we know
        if (!raw.revenueBreakdown) {
          revenueBreakdown.total = metrics.totalRevenue;
        }

        // Platform commission (15% standard)
        const platformCommission = metrics.totalRevenue * (metrics.profitMargin > 0 ? (1 - metrics.profitMargin / 100) : 0.15);
        const netRevenue = metrics.totalRevenue - platformCommission;

        setData({
          metrics,
          revenueBreakdown,
          coinsRedeemed: raw.coinsRedeemed ?? 0,
          newCustomers: metrics.totalCustomers - metrics.returningCustomers,
          returningCustomers: metrics.returningCustomers,
          platformCommission,
          netRevenue,
          cashbackDistributed: metrics.totalCashbackPaid,
        });
      } catch (error: any) {
        if (__DEV__) console.error('Day-end report error:', error);
        showAlert('Error', error.message || 'Failed to load report data');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [activeStore?._id, selectedDate]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ─── Share / Export ───────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!data?.metrics) return;

    const m = data.metrics;
    const storeName = activeStore?.name || 'Store';
    const dateStr = formatDate(selectedDate);

    const lines = [
      `--- Day-End Report ---`,
      `${storeName} | ${dateStr}`,
      ``,
      `Total Sales: ${formatCurrency(m.totalRevenue)}`,
      `Total Orders: ${m.totalOrders}`,
      `Avg Order Value: ${formatCurrency(m.averageOrderValue)}`,
      ``,
      `Orders: ${m.completedOrders} completed, ${m.cancelledOrders} cancelled, ${m.pendingOrders} pending`,
      ``,
      `Net Revenue: ${formatCurrency(data.netRevenue)}`,
      `Platform Commission: ${formatCurrency(data.platformCommission)}`,
      `Cashback Distributed: ${formatCurrency(data.cashbackDistributed)}`,
      ``,
      `Customers: ${data.newCustomers} new, ${data.returningCustomers} returning`,
    ];

    if (m.topSellingProducts.length > 0) {
      lines.push('', 'Top Products:');
      m.topSellingProducts.slice(0, 5).forEach((p, i) => {
        lines.push(`  ${i + 1}. ${p.name} - ${p.totalSold} sold (${formatCurrency(p.revenue)})`);
      });
    }

    lines.push('', '--- Generated by Rez Merchant ---');

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // User cancelled
    }
  }, [data, activeStore, selectedDate]);

  // ─── Render helpers ───────────────────────────────────────────────────

  const renderStatCard = (
    label: string,
    value: string,
    icon: keyof typeof Ionicons.glyphMap,
    iconBg: string,
    iconColor: string,
    trend?: number
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend != null && trend !== 0 && (
        <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
          <Ionicons
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={10}
            color={trend >= 0 ? '#059669' : '#DC2626'}
          />
          <Text style={[styles.trendText, { color: trend >= 0 ? '#059669' : '#DC2626' }]}>
            {Math.abs(trend).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderBreakdownRow = (
    label: string,
    amount: number,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    isLast = false
  ) => (
    <View style={[styles.breakdownRow, !isLast && styles.breakdownBorder]}>
      <View style={styles.breakdownLeft}>
        <View style={[styles.breakdownDot, { backgroundColor: color }]} />
        <Ionicons name={icon} size={16} color={color} style={{ marginRight: 8 }} />
        <Text style={styles.breakdownLabel}>{label}</Text>
      </View>
      <Text style={styles.breakdownAmount}>{formatCurrency(amount)}</Text>
    </View>
  );

  // ─── Loading state ────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
          <Text style={styles.headerTitle}>Day-End Report</Text>
          <Text style={styles.headerSubtitle}>{formatDate(selectedDate)}</Text>
        </LinearGradient>
        <View style={styles.loadingWrap}>
          <View style={styles.loadingIconCircle}>
            <Ionicons name="document-text" size={32} color="#7C3AED" />
          </View>
          <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      </View>
    );
  }

  const m = data?.metrics;

  // ─── Main render ──────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Day-End Report</Text>
            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.dateText}>
                {isToday ? 'Today' : formatDate(selectedDate)}
              </Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Store indicator */}
          {activeStore && (
            <View style={styles.storeChip}>
              <Ionicons name="storefront" size={14} color="#7C3AED" />
              <Text style={styles.storeChipText} numberOfLines={1}>
                {activeStore.name}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchReport(true)} tintColor="#7C3AED" />
        }
      >
        {/* Stats Grid 2x2 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Sales',
              formatCurrency(m?.totalRevenue ?? 0),
              'cash-outline',
              '#EDE9FE',
              '#7C3AED',
              m?.revenueGrowth
            )}
            {renderStatCard(
              'Total Orders',
              String(m?.totalOrders ?? 0),
              'receipt-outline',
              '#DBEAFE',
              '#3B82F6',
              m?.ordersGrowth
            )}
            {renderStatCard(
              'Avg Order Value',
              formatCurrency(m?.averageOrderValue ?? 0),
              'trending-up-outline',
              '#D1FAE5',
              '#10B981'
            )}
            {renderStatCard(
              'Coins Redeemed',
              String(data?.coinsRedeemed ?? 0),
              'sparkles-outline',
              '#FEF3C7',
              '#F59E0B'
            )}
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {formatCurrency(data?.revenueBreakdown.total ?? 0)}
              </Text>
            </View>
          </View>
          {renderBreakdownRow('Cash Payments', data?.revenueBreakdown.cash ?? 0, 'cash', '#10B981')}
          {renderBreakdownRow('UPI Payments', data?.revenueBreakdown.upi ?? 0, 'phone-portrait', '#3B82F6')}
          {renderBreakdownRow('Card Payments', data?.revenueBreakdown.card ?? 0, 'card', '#8B5CF6')}
          {renderBreakdownRow('Wallet / Coins', data?.revenueBreakdown.wallet ?? 0, 'wallet', '#F59E0B')}
          {renderBreakdownRow('Other', data?.revenueBreakdown.other ?? 0, 'ellipsis-horizontal', '#6B7280', true)}
        </View>

        {/* Orders Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Orders Breakdown</Text>
          <View style={styles.ordersGrid}>
            <View style={[styles.orderStat, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={[styles.orderStatValue, { color: '#059669' }]}>
                {m?.completedOrders ?? 0}
              </Text>
              <Text style={styles.orderStatLabel}>Completed</Text>
            </View>
            <View style={[styles.orderStat, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={20} color="#DC2626" />
              <Text style={[styles.orderStatValue, { color: '#DC2626' }]}>
                {m?.cancelledOrders ?? 0}
              </Text>
              <Text style={styles.orderStatLabel}>Cancelled</Text>
            </View>
            <View style={[styles.orderStat, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={20} color="#D97706" />
              <Text style={[styles.orderStatValue, { color: '#D97706' }]}>
                {m?.pendingOrders ?? 0}
              </Text>
              <Text style={styles.orderStatLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Top Products */}
        {(m?.topSellingProducts?.length ?? 0) > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            {m!.topSellingProducts.slice(0, 5).map((product, index) => (
              <View
                key={product.productId || index}
                style={[
                  styles.productRow,
                  index < Math.min(m!.topSellingProducts.length, 5) - 1 && styles.productBorder,
                ]}
              >
                <View style={styles.productRank}>
                  <Text style={styles.productRankText}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productMeta}>
                    {product.totalSold} sold
                  </Text>
                </View>
                <Text style={styles.productRevenue}>
                  {formatCurrency(product.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary Card */}
        <View style={[styles.sectionCard, styles.summaryCard]}>
          <LinearGradient
            colors={['#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryTitle}>Day Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Net Revenue</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data?.netRevenue ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Commission</Text>
              <Text style={styles.summaryValue}>
                -{formatCurrency(data?.platformCommission ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cashback Distributed</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data?.cashbackDistributed ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Customers</Text>
              </View>
              <View style={styles.customerBreakdown}>
                <View style={styles.customerTag}>
                  <Ionicons name="person-add" size={12} color="#A5F3FC" />
                  <Text style={styles.customerTagText}>
                    {data?.newCustomers ?? 0} new
                  </Text>
                </View>
                <View style={styles.customerTag}>
                  <Ionicons name="refresh" size={12} color="#BBF7D0" />
                  <Text style={styles.customerTagText}>
                    {data?.returningCustomers ?? 0} returning
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <LinearGradient
              colors={['#7C3AED', '#6366F1']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Share Report</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonOutline]}
            onPress={() => {
              if (Platform.OS === 'web') {
                try { window.print(); } catch { showAlert('Print', 'Printing is not supported on this device.'); }
              } else {
                showAlert('Print', 'Use the Share button to export and print the report.');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="print-outline" size={20} color="#7C3AED" />
            <Text style={[styles.actionText, { color: '#7C3AED' }]}>Print</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Date</Text>
            {dateOptions.map((opt, i) => {
              const isSelected =
                opt.date.getDate() === selectedDate.getDate() &&
                opt.date.getMonth() === selectedDate.getMonth() &&
                opt.date.getFullYear() === selectedDate.getFullYear();

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                  onPress={() => {
                    setSelectedDate(new Date(opt.date));
                    setShowDatePicker(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? '#7C3AED' : '#9CA3AF'}
                  />
                  <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 40) + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 140,
    marginTop: 4,
  },
  storeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    flexShrink: 1,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Total badge
  totalBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Revenue breakdown
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  breakdownBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  // Orders breakdown
  ordersGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  orderStat: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  orderStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  orderStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Top Products
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  // Summary card
  summaryCard: {
    padding: 0,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 6,
  },
  customerBreakdown: {
    flexDirection: 'row',
    gap: 8,
  },
  customerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  customerTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonOutline: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Date picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateOptionSelected: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  dateOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  dateOptionTextSelected: {
    fontWeight: '700',
    color: '#7C3AED',
  },
});
