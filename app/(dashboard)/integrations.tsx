import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useStore } from '@/contexts/StoreContext';
import { integrationApiService, IntegrationStatus } from '@/services/api/integrations';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  active: { color: '#10B981', bg: '#D1FAE5', label: 'Connected', icon: 'checkmark-circle' },
  paused: { color: '#F59E0B', bg: '#FEF3C7', label: 'Paused', icon: 'pause-circle' },
  error: { color: '#EF4444', bg: '#FEE2E2', label: 'Error', icon: 'alert-circle' },
  pending_setup: { color: '#6B7280', bg: '#F3F4F6', label: 'Setup Pending', icon: 'time' },
};

const TYPE_LABELS: Record<string, string> = {
  pos: 'POS System',
  pms: 'Hotel PMS',
  booking: 'Booking Engine',
  inventory: 'Inventory Software',
  manual: 'Manual Entry',
};

export default function IntegrationsScreen() {
  const { activeStore } = useStore();
  const [data, setData] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeStore?._id) return;
    try {
      const result = await integrationApiService.getStatus(activeStore._id);
      setData(result);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStore?._id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const integrations = data?.integrations || [];
  const hasIntegrations = integrations.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#7C3AED" />}
    >
      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#6366F1']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="git-branch" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Integrations</Text>
            <Text style={styles.headerSubtitle}>Connect your POS, PMS, or booking system</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statValue, { color: '#2563EB' }]}>{data?.recentTransactions || 0}</Text>
          <Text style={styles.statLabel}>Synced Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{data?.pendingTransactions || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{integrations.filter(i => i.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Integration List */}
      {hasIntegrations ? (
        integrations.map(integration => {
          const statusConf = STATUS_CONFIG[integration.status] || STATUS_CONFIG.pending_setup;
          return (
            <View key={integration._id} style={styles.integrationCard}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationInfo}>
                  <Text style={styles.providerName}>{integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)}</Text>
                  <Text style={styles.integrationTypeBadge}>{TYPE_LABELS[integration.integrationType] || integration.integrationType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                  <Ionicons name={statusConf.icon as any} size={14} color={statusConf.color} />
                  <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
                </View>
              </View>

              <View style={styles.integrationMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="sync-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>
                    {integration.lastSyncAt ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}` : 'Never synced'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="flash-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{integration.syncMode === 'realtime' ? 'Real-time' : 'Batch'}</Text>
                </View>
              </View>

              {integration.errorCount > 0 && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{integration.errorCount} sync error(s)</Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="git-branch-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Integrations Yet</Text>
          <Text style={styles.emptySubtitle}>Contact support to connect your POS, PMS, or booking system. You can also upload transactions via CSV.</Text>
        </View>
      )}

      {/* Manual Options */}
      <View style={styles.manualSection}>
        <Text style={styles.sectionTitle}>Manual Options</Text>
        <View style={styles.manualRow}>
          <TouchableOpacity style={styles.manualCard}>
            <View style={[styles.manualIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="qr-code-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.manualLabel}>QR Scan</Text>
            <Text style={styles.manualDesc}>Customer scans QR to pay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualCard}>
            <View style={[styles.manualIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="document-text-outline" size={24} color="#16A34A" />
            </View>
            <Text style={styles.manualLabel}>CSV Upload</Text>
            <Text style={styles.manualDesc}>Upload daily transaction report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  integrationCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }) },
  integrationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  integrationInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  integrationTypeBadge: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  integrationMeta: { flexDirection: 'row', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  errorText: { fontSize: 12, color: '#DC2626' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  manualSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  manualRow: { flexDirection: 'row', gap: 12 },
  manualCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }) },
  manualIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  manualLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  manualDesc: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 4 },
});
