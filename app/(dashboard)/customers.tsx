import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/contexts/StoreContext';
import { Colors } from '@/constants/Colors';
import { getApiUrl } from '@/config/api';
import { storageService } from '@/services/storage';

// ============================================
// TYPES
// ============================================

interface Customer {
  customerId: string;
  name: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  firstOrderDate: string;
  loyaltyTier?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type SortField = 'lastOrderDate' | 'totalSpent' | 'totalOrders' | 'name';

// ============================================
// CONSTANTS
// ============================================

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Bronze: { bg: '#FEF3C7', text: '#92400E' },
  Silver: { bg: '#F3F4F6', text: '#374151' },
  Gold: { bg: '#FFFBEB', text: '#B45309' },
  Platinum: { bg: '#EDE9FE', text: '#7C3AED' },
};

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: 'lastOrderDate', label: 'Recent Visit' },
  { key: 'totalSpent', label: 'Total Spent' },
  { key: 'totalOrders', label: 'Orders' },
  { key: 'name', label: 'Name' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function formatCurrency(amount: number): string {
  return '\u20B9' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CustomersScreen() {
  const { activeStore } = useStore();

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('lastOrderDate');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Debounce ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ============================================
  // API
  // ============================================

  const fetchCustomers = useCallback(async (page: number = 1, append: boolean = false, search?: string) => {
    if (!activeStore?._id) return;

    if (page === 1 && !append) {
      setIsLoading(true);
    }

    try {
      const token = await storageService.getAuthToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder: 'desc',
        storeId: activeStore._id,
      });

      const searchTerm = search !== undefined ? search : searchQuery;
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(getApiUrl(`merchant/analytics/customers/list?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.success && json.data) {
        const { customers: newCustomers, pagination: pag } = json.data;
        if (append) {
          setCustomers(prev => [...prev, ...newCustomers]);
        } else {
          setCustomers(newCustomers);
        }
        setPagination(pag);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch customers:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [activeStore?._id, sortBy, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchCustomers(1, false, '');
    isFirstRender.current = false;
  }, [activeStore?._id, sortBy]);

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchCustomers(1, false, searchQuery);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCustomers(1, false);
  }, [fetchCustomers]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !pagination?.hasNextPage) return;
    setIsLoadingMore(true);
    fetchCustomers(pagination.page + 1, true);
  }, [isLoadingMore, pagination, fetchCustomers]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCustomerCard = useCallback(({ item }: { item: Customer }) => {
    const displayName = item.name || item.phoneNumber || 'Unknown Customer';
    const tierInfo = item.loyaltyTier ? TIER_COLORS[item.loyaltyTier] : null;

    return (
      <TouchableOpacity style={styles.customerCard} activeOpacity={0.7}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.name || item.phoneNumber || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.customerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {displayName}
            </Text>
            {tierInfo && (
              <View style={[styles.tierBadge, { backgroundColor: tierInfo.bg }]}>
                <Text style={[styles.tierText, { color: tierInfo.text }]}>
                  {item.loyaltyTier}
                </Text>
              </View>
            )}
          </View>

          {item.name && item.phoneNumber ? (
            <Text style={styles.customerPhone}>{item.phoneNumber}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={13} color={Colors.light.textMuted} />
              <Text style={styles.statText}>
                {item.totalOrders} order{item.totalOrders !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="wallet-outline" size={13} color={Colors.light.textMuted} />
              <Text style={styles.statText}>{formatCurrency(item.totalSpent)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={13} color={Colors.light.textMuted} />
              <Text style={styles.statText}>{formatDate(item.lastOrderDate)}</Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={Colors.light.borderMedium} />
      </TouchableOpacity>
    );
  }, []);

  const renderEmptyState = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="people-outline" size={36} color={Colors.light.primary} />
        </View>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'No Customers Found' : 'No Customers Yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? `No results for "${searchQuery}". Try a different search.`
            : 'Customers who place orders at your store will appear here.'}
        </Text>
      </View>
    );
  }, [isLoading, searchQuery]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderHeader = useCallback(() => {
    if (!pagination) return null;
    return (
      <View style={styles.resultsMeta}>
        <Text style={styles.resultsCount}>
          {pagination.total} customer{pagination.total !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={Colors.light.primary} />
          <Text style={styles.sortButtonText}>
            {SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'Sort'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [pagination, sortBy, showSortMenu]);

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(option.key);
                setShowSortMenu(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Ionicons name="checkmark" size={18} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconCircle}>
            <Ionicons name="people" size={32} color={Colors.light.primary} />
          </View>
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.customerId}
          renderItem={renderCustomerCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            customers.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 40) + 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
  },

  // Results meta
  resultsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  // Sort dropdown
  sortDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 154 : (StatusBar.currentHeight || 40) + 110,
    right: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    }),
    zIndex: 100,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 180,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  sortOptionActive: {
    backgroundColor: '#F5F3FF',
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  sortOptionTextActive: {
    color: Colors.light.primary,
    fontWeight: '600',
  },

  // Customer card
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    }),
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  customerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customerPhone: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.light.borderLight,
    marginHorizontal: 8,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
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
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textMuted,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
