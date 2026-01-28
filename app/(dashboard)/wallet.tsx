import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { walletService, WalletSummary, WalletTransaction, BankDetails } from '@/services/api/wallet';

type TabType = 'overview' | 'transactions' | 'bank';
type TransactionFilter = 'all' | 'credit' | 'withdrawal' | 'refund';

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [walletData, setWalletData] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState<Partial<BankDetails>>({});

  const fetchWalletData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setIsLoading(true);

      const [summary, transactionsData] = await Promise.all([
        walletService.getWalletSummary(),
        walletService.getTransactions(1, 50, transactionFilter !== 'all' ? transactionFilter as any : undefined)
      ]);

      setWalletData(summary);
      setTransactions(transactionsData.transactions);

      if (summary.bankDetails) {
        setBankDetails(summary.bankDetails);
      }
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      Alert.alert('Error', error.message || 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [transactionFilter]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (walletData && amount > walletData.balance.available) {
      Alert.alert('Insufficient Balance', 'Withdrawal amount exceeds available balance');
      return;
    }

    if (walletData && amount < walletData.minWithdrawalAmount) {
      Alert.alert('Minimum Amount', `Minimum withdrawal amount is ${formatCurrency(walletData.minWithdrawalAmount)}`);
      return;
    }

    try {
      const result = await walletService.requestWithdrawal(amount);
      Alert.alert('Success', result.message);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchWalletData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request withdrawal');
    }
  };

  const handleUpdateBankDetails = async () => {
    if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName || !bankDetails.bankName) {
      Alert.alert('Missing Information', 'Please fill all required fields');
      return;
    }

    try {
      const result = await walletService.updateBankDetails({
        accountNumber: bankDetails.accountNumber!,
        ifscCode: bankDetails.ifscCode!,
        accountHolderName: bankDetails.accountHolderName!,
        bankName: bankDetails.bankName!,
        branchName: bankDetails.branchName,
        upiId: bankDetails.upiId,
      });
      Alert.alert('Success', result.message);
      setShowBankModal(false);
      fetchWalletData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update bank details');
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return 'arrow-down-circle';
      case 'withdrawal': return 'arrow-up-circle';
      case 'refund': return 'refresh-circle';
      default: return 'ellipse';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit': return Colors.light.success;
      case 'withdrawal': return Colors.light.warning;
      case 'refund': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Loading wallet...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchWalletData(true)} />
      }
    >
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>Wallet</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your earnings and withdrawals</ThemedText>
          </View>
        </View>

        {/* Balance Card */}
        {walletData && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
                <ThemedText style={styles.balanceValue}>{formatCurrency(walletData.balance.available)}</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => setShowWithdrawModal(true)}
                disabled={walletData.balance.available < walletData.minWithdrawalAmount}
              >
                <Ionicons name="wallet-outline" size={20} color={Colors.light.background} />
                <ThemedText style={styles.withdrawButtonText}>Withdraw</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceDetailItem}>
                <ThemedText style={styles.detailLabel}>Pending</ThemedText>
                <ThemedText style={styles.detailValue}>{formatCurrency(walletData.balance.pending)}</ThemedText>
              </View>
              <View style={styles.balanceDetailItem}>
                <ThemedText style={styles.detailLabel}>Total Withdrawn</ThemedText>
                <ThemedText style={styles.detailValue}>{formatCurrency(walletData.balance.withdrawn)}</ThemedText>
              </View>
              <View style={styles.balanceDetailItem}>
                <ThemedText style={styles.detailLabel}>Total Earned</ThemedText>
                <ThemedText style={styles.detailValue}>{formatCurrency(walletData.balance.total)}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['overview', 'transactions', 'bank'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && walletData && (
          <View style={styles.statsContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Sales Overview</ThemedText>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={24} color={Colors.light.success} />
                <ThemedText style={styles.statValue}>{formatCurrency(walletData.statistics.totalSales)}</ThemedText>
                <ThemedText style={styles.statLabel}>Gross Sales</ThemedText>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="remove-circle-outline" size={24} color={Colors.light.error} />
                <ThemedText style={styles.statValue}>{formatCurrency(walletData.statistics.totalPlatformFees)}</ThemedText>
                <ThemedText style={styles.statLabel}>Platform Fees (15%)</ThemedText>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color={Colors.light.primary} />
                <ThemedText style={styles.statValue}>{formatCurrency(walletData.statistics.netSales)}</ThemedText>
                <ThemedText style={styles.statLabel}>Net Sales</ThemedText>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="receipt-outline" size={24} color={Colors.light.warning} />
                <ThemedText style={styles.statValue}>{walletData.statistics.totalOrders}</ThemedText>
                <ThemedText style={styles.statLabel}>Total Orders</ThemedText>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="analytics-outline" size={24} color={Colors.light.textSecondary} />
                <ThemedText style={styles.statValue}>{formatCurrency(walletData.statistics.averageOrderValue)}</ThemedText>
                <ThemedText style={styles.statLabel}>Avg Order Value</ThemedText>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="refresh-outline" size={24} color={Colors.light.error} />
                <ThemedText style={styles.statValue}>{formatCurrency(walletData.statistics.totalRefunds)}</ThemedText>
                <ThemedText style={styles.statLabel}>Refunds</ThemedText>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.transactionsContainer}>
            <View style={styles.filterRow}>
              {(['all', 'credit', 'withdrawal', 'refund'] as TransactionFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, transactionFilter === filter && styles.activeFilterChip]}
                  onPress={() => setTransactionFilter(filter)}
                >
                  <ThemedText style={[styles.filterText, transactionFilter === filter && styles.activeFilterText]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={Colors.light.textSecondary} />
                <ThemedText style={styles.emptyText}>No transactions found</ThemedText>
              </View>
            ) : (
              transactions.map((tx) => (
                <View key={tx._id} style={styles.transactionCard}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={getTransactionIcon(tx.type) as any}
                      size={28}
                      color={getTransactionColor(tx.type)}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <ThemedText style={styles.transactionDesc}>{tx.description}</ThemedText>
                    <ThemedText style={styles.transactionDate}>
                      {formatDate(tx.createdAt)} {tx.orderNumber && `• ${tx.orderNumber}`}
                    </ThemedText>
                  </View>
                  <View style={styles.transactionAmount}>
                    <ThemedText style={[styles.transactionValue, { color: getTransactionColor(tx.type) }]}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.netAmount || tx.amount)}
                    </ThemedText>
                    {tx.platformFee && tx.platformFee > 0 && (
                      <ThemedText style={styles.feeText}>Fee: {formatCurrency(tx.platformFee)}</ThemedText>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'bank' && (
          <View style={styles.bankContainer}>
            {walletData?.bankDetails?.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                <ThemedText style={styles.verifiedText}>Bank Account Verified</ThemedText>
              </View>
            ) : walletData?.bankDetails?.accountNumber ? (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={20} color={Colors.light.warning} />
                <ThemedText style={styles.pendingText}>Verification Pending</ThemedText>
              </View>
            ) : null}

            <View style={styles.bankCard}>
              <ThemedText style={styles.bankLabel}>Account Holder</ThemedText>
              <ThemedText style={styles.bankValue}>{walletData?.bankDetails?.accountHolderName || 'Not set'}</ThemedText>

              <ThemedText style={styles.bankLabel}>Account Number</ThemedText>
              <ThemedText style={styles.bankValue}>
                {walletData?.bankDetails?.accountNumber
                  ? `****${walletData.bankDetails.accountNumber.slice(-4)}`
                  : 'Not set'}
              </ThemedText>

              <ThemedText style={styles.bankLabel}>IFSC Code</ThemedText>
              <ThemedText style={styles.bankValue}>{walletData?.bankDetails?.ifscCode || 'Not set'}</ThemedText>

              <ThemedText style={styles.bankLabel}>Bank Name</ThemedText>
              <ThemedText style={styles.bankValue}>{walletData?.bankDetails?.bankName || 'Not set'}</ThemedText>

              {walletData?.bankDetails?.upiId && (
                <>
                  <ThemedText style={styles.bankLabel}>UPI ID</ThemedText>
                  <ThemedText style={styles.bankValue}>{walletData.bankDetails.upiId}</ThemedText>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.updateBankButton} onPress={() => setShowBankModal(true)}>
              <Ionicons name="pencil" size={18} color={Colors.light.background} />
              <ThemedText style={styles.updateBankText}>
                {walletData?.bankDetails?.accountNumber ? 'Update Bank Details' : 'Add Bank Details'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Request Withdrawal</ThemedText>

            <ThemedText style={styles.modalLabel}>Amount</ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <ThemedText style={styles.modalHint}>
              Available: {formatCurrency(walletData?.balance.available || 0)} |
              Min: {formatCurrency(walletData?.minWithdrawalAmount || 100)}
            </ThemedText>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowWithdrawModal(false)}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleWithdraw}>
                <ThemedText style={styles.confirmButtonText}>Withdraw</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Details Modal */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Bank Details</ThemedText>

              <ThemedText style={styles.modalLabel}>Account Holder Name *</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter name as per bank"
                value={bankDetails.accountHolderName || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountHolderName: text })}
              />

              <ThemedText style={styles.modalLabel}>Account Number *</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter account number"
                keyboardType="numeric"
                value={bankDetails.accountNumber || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
              />

              <ThemedText style={styles.modalLabel}>IFSC Code *</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter IFSC code"
                autoCapitalize="characters"
                value={bankDetails.ifscCode || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, ifscCode: text.toUpperCase() })}
              />

              <ThemedText style={styles.modalLabel}>Bank Name *</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter bank name"
                value={bankDetails.bankName || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
              />

              <ThemedText style={styles.modalLabel}>Branch Name</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter branch name (optional)"
                value={bankDetails.branchName || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, branchName: text })}
              />

              <ThemedText style={styles.modalLabel}>UPI ID</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter UPI ID (optional)"
                value={bankDetails.upiId || ''}
                onChangeText={(text) => setBankDetails({ ...bankDetails, upiId: text })}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowBankModal(false)}>
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleUpdateBankDetails}>
                  <ThemedText style={styles.confirmButtonText}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceItem: {},
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceValue: {
    color: Colors.light.background,
    fontSize: 28,
    fontWeight: 'bold',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  withdrawButtonText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
  },
  balanceDetailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.light.background,
  },
  sectionTitle: {
    marginBottom: 16,
    color: Colors.light.text,
  },
  statsContainer: {},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  transactionsContainer: {},
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
  },
  activeFilterChip: {
    backgroundColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 13,
    color: Colors.light.text,
  },
  activeFilterText: {
    color: Colors.light.background,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  feeText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  bankContainer: {},
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  verifiedText: {
    color: Colors.light.success,
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  pendingText: {
    color: Colors.light.warning,
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bankLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  bankValue: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
  },
  updateBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  updateBankText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.light.text,
  },
  modalLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
  },
  modalHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
});
