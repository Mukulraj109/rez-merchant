import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable,
  Modal,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Colors, Spacing, Shadows, BorderRadius, Typography } from '@/constants/DesignTokens';
import { Card, Heading2, Heading3, BodyText, Caption, Badge, Button } from '@/components/ui/DesignSystemComponents';
import { useOrdersDashboard, StatusFilter } from '@/hooks/useOrdersDashboard';
import type { Order, OrderStatus } from '@/types/api';

const { width } = Dimensions.get('window');

const statusColors: Record<string, string> = {
  placed: Colors.warning[500],
  confirmed: Colors.primary[500],
  preparing: Colors.warning[600],
  ready: Colors.success[500],
  dispatched: Colors.primary[600],
  delivered: Colors.success[600],
  cancelled: Colors.error[500],
  returned: Colors.warning[700],
  refunded: Colors.gray[500],
};

const statusLabels: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

// ==================== StatusTab ====================

interface StatusTabProps {
  status: StatusFilter;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

const StatusTab = ({ status, label, count, active, onPress }: StatusTabProps) => (
  <Pressable
    style={[
      styles.statusTab,
      active && styles.activeStatusTab,
      active && { backgroundColor: status === 'all' ? Colors.primary[500] : statusColors[status as OrderStatus] || Colors.primary[500], borderColor: 'transparent' },
    ]}
    onPress={onPress}
  >
    <BodyText style={[styles.statusTabText, active && styles.activeStatusTabText]}>{label}</BodyText>
    <View style={[styles.statusCount, active && styles.activeStatusCount]}>
      <Caption style={[styles.statusCountText, active && styles.activeStatusCountText]}>{count}</Caption>
    </View>
  </Pressable>
);

// ==================== OrderCard ====================

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onQuickAction: (orderId: string, action: string) => void;
  onUpdateStatus: (orderId: string, currentStatus: string) => void;
  index: number;
}

const formatAddress = (address: any) => {
  if (typeof address === 'string') return address;
  if (!address) return 'No address';
  return [address.addressLine1, address.city, address.state, address.pincode].filter(Boolean).join(', ') || 'No address';
};

const paymentMethodIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'razorpay': return 'card';
    case 'wallet': return 'wallet';
    case 'cod': return 'cash';
    case 'upi': return 'phone-portrait';
    default: return 'card';
  }
};

const OrderCard = ({ order, onPress, onQuickAction, onUpdateStatus, index }: OrderCardProps) => {
  const scale = useSharedValue(1);

  const timeAgo = React.useMemo(() => {
    if (!order.createdAt) return 'Unknown';
    const diffInMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, [order.createdAt]);

  const isUrgent = order.priority === 'urgent' ||
    (((order.status as string) === 'pending' || order.status === 'placed') &&
      order.createdAt && (Date.now() - new Date(order.createdAt).getTime()) > 7200000);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.98); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  const orderId = order.id || (order as any)._id;
  const statusColor = statusColors[order.status as OrderStatus] || Colors.primary[500];

  const STATUS_TRANSITIONS: Record<string, string[]> = {
    placed: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['dispatched', 'delivered'],
    dispatched: ['delivered'],
    delivered: ['returned', 'refunded'],
    cancelled: ['refunded'],
    returned: ['refunded'],
    refunded: [],
  };

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).springify()} style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Card style={[styles.orderCard, isUrgent && styles.urgentCard]}>
          {/* Header: Order Number + Amount + Status */}
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <View style={styles.orderNumberRow}>
                <BodyText style={styles.orderNumber}>#{order.orderNumber || 'N/A'}</BodyText>
                {isUrgent && (
                  <Badge variant="error" size="small" style={styles.urgentBadge}>
                    <Ionicons name="alert-circle" size={10} color={Colors.text.inverse} />
                    <Caption style={{ color: Colors.text.inverse, fontWeight: '700', fontSize: 9 }}> URGENT</Caption>
                  </Badge>
                )}
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={Colors.text.tertiary} />
                <Caption style={styles.timeAgo}>{timeAgo}</Caption>
              </View>
            </View>
            <View style={styles.orderTotal}>
              <BodyText style={styles.totalAmount}>
                ₹{(order.pricing?.totalAmount || 0).toLocaleString()}
              </BodyText>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor, marginRight: 6 }]} />
                <Caption style={{ color: statusColor, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' }}>
                  {(statusLabels[order.status as OrderStatus] || order.status).replace(/_/g, ' ')}
                </Caption>
              </View>
            </View>
          </View>

          {/* Store Info */}
          {order.store && (
            <View style={styles.storeInfoRow}>
              <Image source={{ uri: (order.store as any)?.logo }} style={styles.storeLogo} contentFit="cover" />
              <View style={styles.storeInfo}>
                <Caption style={styles.storeLabel}>STORE</Caption>
                <BodyText style={styles.storeName}>{(order.store as any)?.name || 'Unknown Store'}</BodyText>
              </View>
            </View>
          )}

          {/* Customer Info */}
          <View style={styles.customerInfo}>
            <View style={[styles.customerAvatar, { backgroundColor: Colors.primary[50] }]}>
              <Text style={[styles.customerInitial, { color: Colors.primary[500] }]}>
                {(order.customer?.name || '?')[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <BodyText style={styles.customerName}>{order.customer?.name || 'Unknown'}</BodyText>
              {order.customer?.phone && (
                <View style={styles.customerContactRow}>
                  <Ionicons name="call-outline" size={12} color={Colors.text.secondary} />
                  <Caption style={styles.customerContact}>{order.customer.phone}</Caption>
                </View>
              )}
            </View>
            <View style={styles.deliveryMethodBadge}>
              <Ionicons
                name={order.delivery?.method === 'delivery' ? 'bicycle' : order.delivery?.method === 'dine_in' ? 'restaurant' : 'bag-handle'}
                size={22}
                color={Colors.primary[500]}
              />
            </View>
          </View>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Caption style={styles.itemsCount}>{order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}</Caption>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
                {order.items.slice(0, 5).map((item: any, i: number) => (
                  <View key={item.id || i} style={styles.itemCard}>
                    {item.image && <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />}
                    <View style={styles.itemInfo}>
                      <Caption style={styles.itemName} numberOfLines={1}>{item.productName}</Caption>
                      <View style={styles.itemDetails}>
                        <Caption style={styles.itemQuantity}>×{item.quantity}</Caption>
                        <Caption style={styles.itemPrice}>₹{item.price}</Caption>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Payment + Delivery Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name={paymentMethodIcon(order.payment?.method || '') as any} size={18} color={Colors.primary[500]} />
              <View style={styles.infoContent}>
                <Caption style={styles.infoLabel}>Payment</Caption>
                <BodyText style={styles.infoValue}>{(order.payment?.method || 'Unknown').toUpperCase()}</BodyText>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={18} color={Colors.primary[500]} />
              <View style={styles.infoContent}>
                <Caption style={styles.infoLabel}>Delivery</Caption>
                <BodyText style={styles.infoValue} numberOfLines={1}>
                  {formatAddress(order.delivery?.fullAddress || order.delivery?.address)}
                </BodyText>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {order.status === 'placed' && (
              <>
                <Button title="Accept" size="small" variant="ghost"
                  onPress={() => orderId && onQuickAction(orderId, 'confirm')}
                  style={{ borderColor: Colors.success[500], borderWidth: 1 }}
                  textStyle={{ color: Colors.success[500] }}
                  icon={<Ionicons name="checkmark" size={16} color={Colors.success[500]} />}
                />
                <Button title="Decline" size="small" variant="ghost"
                  onPress={() => orderId && onQuickAction(orderId, 'cancel')}
                  style={{ borderColor: Colors.error[500], borderWidth: 1 }}
                  textStyle={{ color: Colors.error[500] }}
                  icon={<Ionicons name="close" size={16} color={Colors.error[500]} />}
                />
              </>
            )}
            {order.status === 'confirmed' && (
              <Button title="Start Preparing" size="small" variant="ghost"
                onPress={() => orderId && onQuickAction(orderId, 'prepare')}
                style={{ borderColor: Colors.warning[500], borderWidth: 1 }}
                textStyle={{ color: Colors.warning[500] }}
                icon={<Ionicons name="restaurant" size={16} color={Colors.warning[500]} />}
              />
            )}
            {order.status === 'preparing' && (
              <Button title="Mark Ready" size="small" variant="ghost"
                onPress={() => orderId && onQuickAction(orderId, 'ready')}
                style={{ borderColor: Colors.success[500], borderWidth: 1 }}
                textStyle={{ color: Colors.success[500] }}
                icon={<Ionicons name="checkmark-circle" size={16} color={Colors.success[500]} />}
              />
            )}
          </View>

          {/* Update Status Button */}
          {(STATUS_TRANSITIONS[order.status]?.length > 0) && (
            <TouchableOpacity style={styles.updateStatusButton} onPress={() => orderId && onUpdateStatus(orderId, order.status)} activeOpacity={0.8}>
              <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
              <Text style={styles.updateStatusButtonText}>Update Status</Text>
            </TouchableOpacity>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
};

// ==================== OrdersScreen ====================

export default function OrdersScreen() {
  const dashboard = useOrdersDashboard();
  const {
    orders, statusCounts, loading, refreshing,
    activeFilter, setActiveFilter, sortBy, setSortBy,
    selectedStoreId, setSelectedStoreId,
    realTime, newOrdersCount, clearNewOrders,
    showStatusModal, setShowStatusModal, statusOrderCurrent, processingStatus,
    onRefresh, handleQuickAction, handleUpdateStatus, handleStatusSelect,
    stores, STATUS_TRANSITIONS,
  } = dashboard;

  const renderOrderCard = useCallback(({ item, index }: { item: Order; index: number }) => (
    <OrderCard
      order={item}
      index={index}
      onPress={() => {
        const orderId = (item as any)._id || item.id;
        if (orderId) router.push(`/orders/${orderId}`);
      }}
      onQuickAction={handleQuickAction}
      onUpdateStatus={handleUpdateStatus}
    />
  ), [handleQuickAction, handleUpdateStatus]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <BodyText style={{ marginTop: 12 }}>Loading orders...</BodyText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Heading2 style={styles.headerTitle}>Orders</Heading2>
            {newOrdersCount > 0 && (
              <Animated.View entering={ZoomIn.springify()}>
                <Badge variant="success" size="small" style={styles.newOrdersBadge}>
                  <Ionicons name="add-circle" size={12} color={Colors.text.inverse} />
                  <BodyText style={{ color: Colors.text.inverse, fontSize: 11, fontWeight: '700', marginLeft: 2 }}>
                    +{newOrdersCount}
                  </BodyText>
                </Badge>
              </Animated.View>
            )}
          </View>
          <Caption style={styles.headerSubtitle}>
            {`${orders.length} ${orders.length === 1 ? 'order' : 'orders'} total`}
          </Caption>
        </View>
        <View style={styles.headerRight}>
          <Animated.View
            entering={FadeInRight.delay(100)}
            style={[styles.realtimeIndicator, {
              backgroundColor: realTime.isConnected ? `${Colors.success[500]}15` : `${Colors.error[500]}15`,
            }]}
          >
            <View style={[styles.realtimeStatusDot, { backgroundColor: realTime.isConnected ? Colors.success[500] : Colors.error[500] }]} />
            <BodyText style={[styles.realtimeText, { color: realTime.isConnected ? Colors.success[600] : Colors.error[600] }]}>
              {realTime.isConnected ? 'Live' : 'Offline'}
            </BodyText>
          </Animated.View>
          <TouchableOpacity style={styles.analyticsButton} onPress={() => router.push('/orders/analytics')}>
            <View style={styles.analyticsButtonInner}>
              <Ionicons name="analytics" size={20} color={Colors.primary[500]} />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Store Filter */}
      {stores.length > 1 && (
        <View style={styles.storeFilterContainer}>
          <BodyText style={styles.storeFilterLabel}>Filter by Store:</BodyText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeFilterContent} style={styles.storeFilterScroll}>
            <TouchableOpacity style={[styles.storeFilterButton, !selectedStoreId && styles.storeFilterButtonActive]} onPress={() => setSelectedStoreId(undefined)}>
              <BodyText style={[styles.storeFilterText, !selectedStoreId && styles.storeFilterTextActive]}>All Stores</BodyText>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity key={store._id} style={[styles.storeFilterButton, selectedStoreId === store._id && styles.storeFilterButtonActive]} onPress={() => setSelectedStoreId(store._id)}>
                <BodyText style={[styles.storeFilterText, selectedStoreId === store._id && styles.storeFilterTextActive]}>{store.name}</BodyText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Status Filter Tabs */}
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusTabs} contentContainerStyle={styles.statusTabsContent}>
          <StatusTab status="all" label="All" count={statusCounts.all} active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} />
          {(Object.entries(statusCounts) as Array<[StatusFilter, number]>)
            .filter(([status]) => status !== 'all' && statusCounts[status] > 0)
            .map(([status, count]) => (
              <StatusTab key={status} status={status} label={statusLabels[status as OrderStatus]} count={count} active={activeFilter === status} onPress={() => setActiveFilter(status)} />
            ))}
        </ScrollView>
      </View>

      {/* Sort Controls */}
      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['created', 'priority', 'total'] as const).map((sort) => (
            <TouchableOpacity key={sort} style={[styles.sortButton, sortBy === sort && styles.activeSortButton]} onPress={() => setSortBy(sort)}>
              <Caption style={[styles.sortButtonText, sortBy === sort && styles.activeSortButtonText]}>
                {sort === 'created' ? 'Date' : sort === 'priority' ? 'Priority' : 'Total'}
              </Caption>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List — FlashList for virtualized performance */}
      <FlashList
        data={orders}
        renderItem={renderOrderCard}
        estimatedItemSize={280}
        keyExtractor={(item) => item.id || (item as any)._id || `order-${item.orderNumber}`}
        contentContainerStyle={styles.ordersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={Colors.gray[300]} />
            <Heading3 style={styles.emptyStateTitle}>No Orders Found</Heading3>
            <BodyText style={styles.emptyStateSubtitle}>
              {activeFilter === 'all' ? "You don't have any orders yet" : `No ${statusLabels[activeFilter as OrderStatus]?.toLowerCase()} orders`}
            </BodyText>
          </View>
        }
      />

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="swap-horizontal" size={24} color={Colors.primary[500]} />
              <Heading3 style={styles.modalTitle}>Update Status</Heading3>
            </View>
            <Caption style={styles.modalCurrentStatus}>Current: {statusOrderCurrent.replace(/_/g, ' ')}</Caption>
            <View style={styles.modalOptions}>
              {(STATUS_TRANSITIONS[statusOrderCurrent] || []).map((nextStatus: string) => (
                <TouchableOpacity
                  key={nextStatus}
                  style={[styles.statusOption, { backgroundColor: `${statusColors[nextStatus as OrderStatus] || Colors.primary[500]}15`, borderColor: statusColors[nextStatus as OrderStatus] || Colors.primary[500] }]}
                  onPress={() => handleStatusSelect(nextStatus)}
                  disabled={processingStatus}
                  activeOpacity={0.7}
                >
                  {processingStatus ? (
                    <ActivityIndicator size="small" color={Colors.primary[500]} />
                  ) : (
                    <>
                      <View style={[styles.statusOptionDot, { backgroundColor: statusColors[nextStatus as OrderStatus] || Colors.primary[500] }]} />
                      <BodyText style={styles.statusOptionText}>{(statusLabels[nextStatus as OrderStatus] || nextStatus).replace(/_/g, ' ')}</BodyText>
                      <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowStatusModal(false); }} activeOpacity={0.7}>
              <BodyText style={styles.modalCancelText}>Cancel</BodyText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[50] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  headerLeft: { flex: 1, gap: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: '800', fontSize: 28, color: Colors.text.primary },
  headerSubtitle: { color: Colors.text.secondary, fontSize: 12, marginTop: 2 },
  newOrdersBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  realtimeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  realtimeStatusDot: { width: 8, height: 8, borderRadius: 4 },
  realtimeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  analyticsButton: { padding: 4 },
  analyticsButtonInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  statusTabs: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  statusTabsContent: { gap: 8, paddingRight: Spacing.base },
  statusTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: Colors.background.primary, borderWidth: 1.5, borderColor: Colors.border.default, gap: 8, ...Shadows.sm },
  activeStatusTab: {},
  statusTabText: { fontSize: 14, color: Colors.text.primary },
  activeStatusTabText: { color: Colors.text.inverse, fontWeight: '600' },
  statusCount: { backgroundColor: Colors.gray[100], borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  activeStatusCount: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  statusCountText: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  activeStatusCountText: { color: Colors.text.inverse },
  controls: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  sortButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background.primary, marginRight: 10, borderWidth: 1.5, borderColor: Colors.border.default, ...Shadows.sm },
  activeSortButton: { backgroundColor: Colors.primary[500], borderColor: Colors.primary[500] },
  sortButtonText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 12 },
  activeSortButtonText: { color: Colors.text.inverse, fontWeight: '700', fontSize: 12 },
  ordersList: { padding: Spacing.base, paddingBottom: 80 },
  orderCard: { gap: 0, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.background.primary, marginBottom: Spacing.md, ...Shadows.md },
  urgentCard: { borderLeftWidth: 5, borderLeftColor: Colors.error[500] },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderInfo: { flex: 1, gap: 6 },
  orderNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  orderNumber: { color: Colors.text.primary, fontWeight: '700', fontSize: 18 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeAgo: { color: Colors.text.tertiary, fontSize: 11 },
  orderTotal: { alignItems: 'flex-end', gap: 6 },
  totalAmount: { color: Colors.primary[700], fontWeight: '800', fontSize: 22 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  storeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.sm, marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  storeLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gray[100] },
  storeInfo: { flex: 1 },
  storeName: { fontWeight: '700', fontSize: 13, color: Colors.text.primary },
  storeLabel: { fontSize: 10, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary[100] },
  customerInitial: { fontSize: 20, fontWeight: '700' },
  customerDetails: { flex: 1, gap: 4 },
  customerName: { fontWeight: '700', fontSize: 15, color: Colors.text.primary },
  customerContactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerContact: { color: Colors.text.secondary, fontSize: 12 },
  deliveryMethodBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  itemsSection: { paddingVertical: Spacing.md, gap: 8 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemsCount: { fontWeight: '700', fontSize: 12, color: Colors.text.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemsScroll: { marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md },
  itemCard: { width: 120, marginRight: 12, backgroundColor: Colors.gray[50], borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.light },
  itemImage: { width: '100%', height: 80, backgroundColor: Colors.gray[200] },
  itemInfo: { padding: 8, gap: 4 },
  itemName: { fontWeight: '600', fontSize: 12, color: Colors.text.primary },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemQuantity: { fontSize: 10, color: Colors.text.secondary },
  itemPrice: { fontWeight: '700', fontSize: 12, color: Colors.primary[600] },
  infoGrid: { flexDirection: 'row', gap: 12, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border.light },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 10, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.xs },
  updateStatusButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary[500], paddingVertical: 12, borderRadius: 12, marginTop: Spacing.sm },
  updateStatusButtonText: { color: Colors.text.inverse, fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyStateTitle: { color: Colors.text.primary },
  emptyStateSubtitle: { color: Colors.text.secondary, textAlign: 'center' },
  storeFilterContainer: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, marginBottom: Spacing.xs },
  storeFilterLabel: { marginBottom: 4, fontWeight: '600' },
  storeFilterScroll: { maxHeight: 40 },
  storeFilterContent: { gap: 8, alignItems: 'center' },
  storeFilterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background.primary, borderWidth: 1.5, borderColor: Colors.border.default, ...Shadows.sm },
  storeFilterButtonActive: { backgroundColor: Colors.primary[500], borderColor: Colors.primary[500] },
  storeFilterText: { fontSize: 12, color: Colors.text.primary },
  storeFilterTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modalTitle: { fontWeight: '700', fontSize: 18, color: Colors.text.primary },
  modalCurrentStatus: { fontSize: 13, color: Colors.text.secondary, marginBottom: 16, textTransform: 'capitalize' },
  modalOptions: { gap: 8 },
  statusOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  statusOptionDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text.primary, textTransform: 'capitalize' },
  modalCancelButton: { backgroundColor: Colors.gray[100], paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  modalCancelText: { fontWeight: '600', color: Colors.text.secondary, fontSize: 15 },
});
