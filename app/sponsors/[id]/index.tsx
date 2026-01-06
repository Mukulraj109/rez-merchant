import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  socialImpactAdminService,
  Sponsor,
  SponsorAnalytics,
  SocialImpactEvent,
} from '@/services/api/socialImpact';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function SponsorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Data state
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [analytics, setAnalytics] = useState<SponsorAnalytics | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [activateModalVisible, setActivateModalVisible] = useState(false);

  // Modals
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  // Load sponsor data
  const loadSponsorData = useCallback(async (isRefresh = false) => {
    if (!id) return;

    try {
      if (!isRefresh) setLoading(true);

      const [sponsorData, analyticsData] = await Promise.all([
        socialImpactAdminService.getSponsorById(id),
        socialImpactAdminService.getSponsorAnalytics(id).catch(() => null),
      ]);

      setSponsor(sponsorData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to load sponsor details',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadSponsorData();
  }, [loadSponsorData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSponsorData(true);
  }, [loadSponsorData]);

  // Actions
  const handleDeactivate = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      await socialImpactAdminService.deactivateSponsor(id);
      setDeactivateModalVisible(false);
      setSuccessModal({
        visible: true,
        title: 'Deactivated',
        message: 'Sponsor has been deactivated',
      });
      loadSponsorData(true);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to deactivate sponsor',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      await socialImpactAdminService.activateSponsor(id);
      setActivateModalVisible(false);
      setSuccessModal({
        visible: true,
        title: 'Activated',
        message: 'Sponsor has been activated',
      });
      loadSponsorData(true);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to activate sponsor',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openWebsite = () => {
    if (sponsor?.website) {
      Linking.openURL(sponsor.website);
    }
  };

  const callPhone = () => {
    if (sponsor?.contactPerson?.phone) {
      Linking.openURL(`tel:${sponsor.contactPerson.phone}`);
    }
  };

  const sendEmail = () => {
    if (sponsor?.contactPerson?.email) {
      Linking.openURL(`mailto:${sponsor.contactPerson.email}`);
    }
  };

  const getEventTypeEmoji = (eventType?: string): string => {
    const emojiMap: Record<string, string> = {
      'blood-donation': '🩸',
      'tree-plantation': '🌳',
      'beach-cleanup': '🏖️',
      'digital-literacy': '💻',
      'food-drive': '🍛',
      'health-camp': '🏥',
      'skill-training': '👩‍💼',
      'women-empowerment': '👩‍💼',
      'education': '📚',
      'environment': '🌍',
    };
    return emojiMap[eventType || ''] || '✨';
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading sponsor details...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Error state
  if (!sponsor) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
            <Text style={styles.errorTitle}>Sponsor Not Found</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#F3F4F6']}
          locations={[0, 0.3, 1]}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sponsor Details</Text>
            <TouchableOpacity
              style={styles.headerEditButton}
              onPress={() => router.push(`/sponsors/${id}/edit`)}
            >
              <Ionicons name="pencil" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Logo Section */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoSection}>
              <View style={styles.logoContainer}>
                {sponsor.logo ? (
                  <Image source={{ uri: sponsor.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="business" size={48} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <Text style={styles.sponsorName}>{sponsor.name}</Text>
              <View style={styles.brandCoinRow}>
                <Ionicons name="sparkles" size={16} color="#8B5CF6" />
                <Text style={styles.brandCoinText}>{sponsor.brandCoinName}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: sponsor.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: sponsor.isActive ? '#10B981' : '#EF4444' }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: sponsor.isActive ? '#10B981' : '#EF4444' }
                ]}>
                  {sponsor.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </Animated.View>

            {/* Description */}
            {sponsor.description && (
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.cardTitle}>About</Text>
                </View>
                <Text style={styles.descriptionText}>{sponsor.description}</Text>
              </Animated.View>
            )}

            {/* Website */}
            {sponsor.website && (
              <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
                <TouchableOpacity style={styles.linkRow} onPress={openWebsite}>
                  <Ionicons name="globe-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.linkText}>{sponsor.website}</Text>
                  <Ionicons name="open-outline" size={16} color="#8B5CF6" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Contact Person */}
            {sponsor.contactPerson && (sponsor.contactPerson.name || sponsor.contactPerson.email || sponsor.contactPerson.phone) && (
              <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person" size={20} color="#10B981" />
                  <Text style={styles.cardTitle}>Contact Person</Text>
                </View>
                {sponsor.contactPerson.name && (
                  <Text style={styles.contactName}>{sponsor.contactPerson.name}</Text>
                )}
                {sponsor.contactPerson.email && (
                  <TouchableOpacity style={styles.contactRow} onPress={sendEmail}>
                    <Ionicons name="mail-outline" size={18} color="#6B7280" />
                    <Text style={styles.contactText}>{sponsor.contactPerson.email}</Text>
                  </TouchableOpacity>
                )}
                {sponsor.contactPerson.phone && (
                  <TouchableOpacity style={styles.contactRow} onPress={callPhone}>
                    <Ionicons name="call-outline" size={18} color="#6B7280" />
                    <Text style={styles.contactText}>{sponsor.contactPerson.phone}</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            {/* Analytics */}
            <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart" size={20} color="#F59E0B" />
                <Text style={styles.cardTitle}>Analytics</Text>
              </View>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
                  <Text style={styles.analyticsValue}>
                    {analytics?.totalEventsSponsored || sponsor.totalEventsSponsored || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>Events</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="people-outline" size={24} color="#10B981" />
                  <Text style={styles.analyticsValue}>
                    {analytics?.totalParticipants || sponsor.totalParticipants || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>Participants</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="sparkles-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.analyticsValue}>
                    {(analytics?.totalCoinsDistributed || sponsor.totalCoinsDistributed || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.analyticsLabel}>Coins Given</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#F59E0B" />
                  <Text style={styles.analyticsValue}>
                    {analytics?.completedEvents || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>Completed</Text>
                </View>
              </View>
            </Animated.View>

            {/* Recent Events */}
            {analytics?.events && analytics.events.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                  <Text style={styles.cardTitle}>Sponsored Events</Text>
                </View>
                {analytics.events.slice(0, 5).map((event: SocialImpactEvent) => (
                  <TouchableOpacity
                    key={event._id}
                    style={styles.eventRow}
                    onPress={() => router.push(`/social-impact/${event._id}`)}
                  >
                    <Text style={styles.eventEmoji}>{getEventTypeEmoji(event.eventType)}</Text>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                      <Text style={styles.eventStatus}>{event.eventStatus}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {/* Action Buttons */}
            <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/sponsors/${id}/edit`)}
              >
                <Ionicons name="pencil" size={18} color="#3B82F6" />
                <Text style={styles.editButtonText}>Edit Sponsor</Text>
              </TouchableOpacity>

              {sponsor.isActive ? (
                <TouchableOpacity
                  style={styles.deactivateButton}
                  onPress={() => setDeactivateModalVisible(true)}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={styles.deactivateButtonText}>Deactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={() => setActivateModalVisible(true)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.activateButtonText}>Activate</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>

        {/* Modals */}
        <ConfirmModal
          visible={deactivateModalVisible}
          title="Deactivate Sponsor"
          message={`Are you sure you want to deactivate ${sponsor.name}? They won't be able to sponsor new events.`}
          confirmText="Deactivate"
          cancelText="Cancel"
          type="error"
          loading={actionLoading}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateModalVisible(false)}
        />

        <ConfirmModal
          visible={activateModalVisible}
          title="Activate Sponsor"
          message={`Are you sure you want to activate ${sponsor.name}?`}
          confirmText="Activate"
          cancelText="Cancel"
          type="info"
          loading={actionLoading}
          onConfirm={handleActivate}
          onCancel={() => setActivateModalVisible(false)}
        />

        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal({ visible: false, title: '', message: '' })}
        />

        <SuccessModal
          visible={successModal.visible}
          title={successModal.title}
          message={successModal.message}
          onClose={() => setSuccessModal({ visible: false, title: '', message: '' })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  sponsorName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  brandCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  brandCoinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5CF6',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eventEmoji: {
    fontSize: 24,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deactivateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  deactivateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  activateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
