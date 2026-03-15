import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '@/utils/alert';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { dealRedemptionsService, DealRedemption, RedemptionStats, VerifyCodeResponse } from '@/services/api/dealRedemptions';
import { useStore } from '@/contexts/StoreContext';

type ViewMode = 'scanner' | 'list' | 'stats';
type RedemptionStatus = 'all' | 'active' | 'used' | 'expired';

export default function DealsScreen() {
  const { activeStore } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [redemptions, setRedemptions] = useState<DealRedemption[]>([]);
  const [stats, setStats] = useState<RedemptionStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<RedemptionStatus>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner state
  const [codeInput, setCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyCodeResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // Load data based on view mode
  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setIsLoading(true);

      if (viewMode === 'list') {
        const data = await dealRedemptionsService.getRedemptions({
          status: activeFilter !== 'all' ? activeFilter : undefined,
          limit: 50,
          page: 1,
        });
        setRedemptions(data.redemptions);
      } else if (viewMode === 'stats') {
        const statsData = await dealRedemptionsService.getStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching deal data:', error);
      showAlert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [viewMode, activeFilter]);

  useEffect(() => {
    if (viewMode !== 'scanner') {
      fetchData();
    }
  }, [viewMode, activeFilter]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Verify code
  const handleVerifyCode = async () => {
    if (!codeInput.trim()) {
      showAlert('Error', 'Please enter a redemption code');
      return;
    }

    try {
      setIsVerifying(true);
      const result = await dealRedemptionsService.verifyCode(codeInput.trim());
      setVerifyResult(result);
      setShowResultModal(true);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Mark code as used
  const handleMarkAsUsed = async () => {
    if (!verifyResult?.redemption || !activeStore) {
      showAlert('Error', 'No active store selected');
      return;
    }

    try {
      setIsMarking(true);
      await dealRedemptionsService.useCode(verifyResult.redemption.code, {
        storeId: activeStore._id,
      });

      showAlert('Success', 'Deal redeemed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowResultModal(false);
            setVerifyResult(null);
            setCodeInput('');
          }
        }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark code as used');
    } finally {
      setIsMarking(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return dealRedemptionsService.getStatusInfo(status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render scanner view
  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <LinearGradient
        colors={[Colors.light.primary, Colors.light.indigo]}
        style={styles.scannerHeader}
      >
        <Ionicons name="qr-code" size={48} color="white" />
        <ThemedText style={styles.scannerTitle}>Verify Deal Code</ThemedText>
        <ThemedText style={styles.scannerSubtitle}>
          Enter the customer's redemption code to verify and apply the deal
        </ThemedText>
      </LinearGradient>

      <View style={styles.inputContainer}>
        <View style={styles.codeInputWrapper}>
          <Ionicons name="ticket-outline" size={24} color={Colors.light.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.codeInput}
            placeholder="Enter code (e.g., RZ-XXXXXXXX)"
            placeholderTextColor={Colors.light.textMuted}
            value={codeInput}
            onChangeText={setCodeInput}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {codeInput.length > 0 && (
            <TouchableOpacity onPress={() => setCodeInput('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
          onPress={handleVerifyCode}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <ThemedText style={styles.verifyButtonText}>Verify Code</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.instructionsCard}>
        <ThemedText style={styles.instructionsTitle}>How it works</ThemedText>
        <View style={styles.instructionRow}>
          <View style={styles.instructionNumber}>
            <ThemedText style={styles.instructionNumberText}>1</ThemedText>
          </View>
          <ThemedText style={styles.instructionText}>Ask customer for their deal code</ThemedText>
        </View>
        <View style={styles.instructionRow}>
          <View style={styles.instructionNumber}>
            <ThemedText style={styles.instructionNumberText}>2</ThemedText>
          </View>
          <ThemedText style={styles.instructionText}>Enter the code above to verify</ThemedText>
        </View>
        <View style={styles.instructionRow}>
          <View style={styles.instructionNumber}>
            <ThemedText style={styles.instructionNumberText}>3</ThemedText>
          </View>
          <ThemedText style={styles.instructionText}>Apply the benefit and mark as used</ThemedText>
        </View>
      </View>
    </View>
  );

  // Render list view
  const renderList = () => (
    <View style={styles.listContainer}>
      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsContainer}>
          {(['all', 'active', 'used', 'expired'] as RedemptionStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.tab, activeFilter === status && styles.activeTab]}
              onPress={() => setActiveFilter(status)}
            >
              <ThemedText style={[styles.tabText, activeFilter === status && styles.activeTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Redemptions list */}
      <ScrollView
        style={styles.redemptionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : redemptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyText}>No redemptions found</ThemedText>
          </View>
        ) : (
          redemptions.map((redemption) => {
            const statusInfo = getStatusInfo(redemption.status);
            return (
              <View key={redemption.id} style={styles.redemptionCard}>
                <View style={styles.redemptionHeader}>
                  <View style={styles.codeContainer}>
                    <ThemedText style={styles.redemptionCode}>{redemption.code}</ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                      <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.userName}>{redemption.user.name}</ThemedText>
                </View>

                <View style={styles.redemptionDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag" size={16} color={Colors.light.primary} />
                    <ThemedText style={styles.detailText}>
                      {redemption.campaignSnapshot.title}
                    </ThemedText>
                  </View>
                  {redemption.dealSnapshot.cashback && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={16} color={Colors.light.success} />
                      <ThemedText style={styles.detailText}>
                        {redemption.dealSnapshot.cashback} cashback
                      </ThemedText>
                    </View>
                  )}
                  {redemption.dealSnapshot.discount && (
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetags" size={16} color={Colors.light.warning} />
                      <ThemedText style={styles.detailText}>
                        {redemption.dealSnapshot.discount} discount
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.redemptionFooter}>
                  <ThemedText style={styles.dateText}>
                    Redeemed: {formatDate(redemption.redeemedAt)}
                  </ThemedText>
                  {redemption.usedAt && (
                    <ThemedText style={styles.dateText}>
                      Used: {formatDate(redemption.usedAt)}
                    </ThemedText>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // Render stats view
  const renderStats = () => (
    <ScrollView
      style={styles.statsContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : stats ? (
        <>
          {/* Period stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statPeriod}>Today</ThemedText>
              <ThemedText style={styles.statValue}>{stats.today.total}</ThemedText>
              <View style={styles.statBreakdown}>
                <ThemedText style={styles.statBreakdownText}>
                  {stats.today.used} used • {stats.today.pending} pending
                </ThemedText>
              </View>
            </View>

            <View style={styles.statCard}>
              <ThemedText style={styles.statPeriod}>This Week</ThemedText>
              <ThemedText style={styles.statValue}>{stats.thisWeek.total}</ThemedText>
              <View style={styles.statBreakdown}>
                <ThemedText style={styles.statBreakdownText}>
                  {stats.thisWeek.used} used • {stats.thisWeek.pending} pending
                </ThemedText>
              </View>
            </View>

            <View style={styles.statCard}>
              <ThemedText style={styles.statPeriod}>This Month</ThemedText>
              <ThemedText style={styles.statValue}>{stats.thisMonth.total}</ThemedText>
              <View style={styles.statBreakdown}>
                <ThemedText style={styles.statBreakdownText}>
                  {stats.thisMonth.used} used • {stats.thisMonth.pending} pending
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Revenue card */}
          <View style={styles.revenueCard}>
            <LinearGradient
              colors={[Colors.light.success, '#059669']}
              style={styles.revenueGradient}
            >
              <Ionicons name="cash" size={32} color="white" />
              <View style={styles.revenueContent}>
                <ThemedText style={styles.revenueLabel}>Total Revenue from Paid Deals</ThemedText>
                <ThemedText style={styles.revenueValue}>₹{stats.totalRevenue.toLocaleString()}</ThemedText>
              </View>
            </LinearGradient>
          </View>

          {/* Top deals */}
          {stats.topDeals.length > 0 && (
            <View style={styles.topDealsCard}>
              <ThemedText style={styles.topDealsTitle}>Top Performing Deals</ThemedText>
              {stats.topDeals.map((deal, index) => (
                <View key={index} style={styles.topDealRow}>
                  <View style={styles.topDealRank}>
                    <ThemedText style={styles.topDealRankText}>#{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.topDealName} numberOfLines={1}>
                    {deal.campaign}
                  </ThemedText>
                  <ThemedText style={styles.topDealCount}>
                    {deal.redemptions} redemptions
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart" size={48} color={Colors.light.textMuted} />
          <ThemedText style={styles.emptyText}>No stats available</ThemedText>
        </View>
      )}
    </ScrollView>
  );

  // Result modal
  const renderResultModal = () => (
    <Modal
      visible={showResultModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowResultModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setShowResultModal(false)}
          >
            <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          {verifyResult?.valid ? (
            <>
              <View style={styles.validHeader}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.light.success} />
                <ThemedText style={styles.validTitle}>Valid Code!</ThemedText>
              </View>

              <View style={styles.redemptionInfo}>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Code</ThemedText>
                  <ThemedText style={styles.infoValue}>{verifyResult.redemption?.code}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Campaign</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {verifyResult.redemption?.campaignSnapshot.title}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Customer</ThemedText>
                  <ThemedText style={styles.infoValue}>{verifyResult.redemption?.user.name}</ThemedText>
                </View>
                {verifyResult.redemption?.dealSnapshot.cashback && (
                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Cashback</ThemedText>
                    <ThemedText style={[styles.infoValue, { color: '#10b981' }]}>
                      {verifyResult.redemption.dealSnapshot.cashback}
                    </ThemedText>
                  </View>
                )}
                {verifyResult.redemption?.dealSnapshot.discount && (
                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Discount</ThemedText>
                    <ThemedText style={[styles.infoValue, { color: '#f59e0b' }]}>
                      {verifyResult.redemption.dealSnapshot.discount}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Expires</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {formatDate(verifyResult.redemption?.expiresAt || '')}
                  </ThemedText>
                </View>
              </View>

              {verifyResult.redemption?.campaignSnapshot.terms && (
                <View style={styles.termsSection}>
                  <ThemedText style={styles.termsTitle}>Terms & Conditions</ThemedText>
                  {verifyResult.redemption.campaignSnapshot.terms.map((term, i) => (
                    <ThemedText key={i} style={styles.termText}>• {term}</ThemedText>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.markUsedButton, isMarking && styles.markUsedButtonDisabled]}
                onPress={handleMarkAsUsed}
                disabled={isMarking}
              >
                {isMarking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={24} color="white" />
                    <ThemedText style={styles.markUsedButtonText}>Mark as Used</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.invalidHeader}>
                <Ionicons name="close-circle" size={64} color={Colors.light.error} />
                <ThemedText style={styles.invalidTitle}>Invalid Code</ThemedText>
                <ThemedText style={styles.invalidReason}>{verifyResult?.reason}</ThemedText>
              </View>

              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={() => {
                  setShowResultModal(false);
                  setCodeInput('');
                }}
              >
                <ThemedText style={styles.tryAgainButtonText}>Try Another Code</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ThemedView style={styles.container}>
      {/* View mode tabs */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'scanner' && styles.viewModeTabActive]}
          onPress={() => setViewMode('scanner')}
        >
          <Ionicons
            name="scan"
            size={20}
            color={viewMode === 'scanner' ? '#7C3AED' : '#6b7280'}
          />
          <ThemedText style={[styles.viewModeText, viewMode === 'scanner' && styles.viewModeTextActive]}>
            Verify
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'list' && styles.viewModeTabActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={20}
            color={viewMode === 'list' ? '#7C3AED' : '#6b7280'}
          />
          <ThemedText style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
            History
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'stats' && styles.viewModeTabActive]}
          onPress={() => setViewMode('stats')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={viewMode === 'stats' ? '#7C3AED' : '#6b7280'}
          />
          <ThemedText style={[styles.viewModeText, viewMode === 'stats' && styles.viewModeTextActive]}>
            Stats
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'scanner' && renderScanner()}
      {viewMode === 'list' && renderList()}
      {viewMode === 'stats' && renderStats()}

      {/* Result modal */}
      {renderResultModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  // View mode tabs
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewModeTabActive: {
    backgroundColor: Colors.light.primaryLight2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  viewModeTextActive: {
    color: Colors.light.primary,
  },

  // Scanner styles
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
  },
  scannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    padding: 16,
    gap: 12,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  codeInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    color: Colors.light.textHeading,
  },
  clearButton: {
    padding: 4,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  instructionsCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textHeading,
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primaryLight2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    flex: 1,
  },

  // List styles
  listContainer: {
    flex: 1,
  },
  tabsScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: 'white',
  },
  redemptionsList: {
    flex: 1,
    padding: 16,
  },
  redemptionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  redemptionHeader: {
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redemptionCode: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textHeading,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  redemptionDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
  },
  redemptionFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textMuted,
    marginTop: 12,
  },

  // Stats styles
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  statPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.textHeading,
    marginTop: 4,
  },
  statBreakdown: {
    marginTop: 8,
  },
  statBreakdownText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  revenueCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  revenueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  revenueContent: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  topDealsCard: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  topDealsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textHeading,
    marginBottom: 16,
  },
  topDealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundTertiary,
  },
  topDealRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primaryLight2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topDealRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  topDealName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textHeading,
  },
  topDealCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  validHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  validTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.success,
    marginTop: 12,
  },
  invalidHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  invalidTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.error,
    marginTop: 12,
  },
  invalidReason: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  redemptionInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textHeading,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  termsSection: {
    marginTop: 16,
    backgroundColor: Colors.light.warningLight,
    borderRadius: 12,
    padding: 16,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  termText: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 4,
  },
  markUsedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  markUsedButtonDisabled: {
    opacity: 0.7,
  },
  markUsedButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  tryAgainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  tryAgainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
});
