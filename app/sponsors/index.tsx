import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { socialImpactAdminService, Sponsor } from '@/services/api/socialImpact';

export default function SponsorsScreen() {
  const router = useRouter();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [filteredSponsors, setFilteredSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSponsors = useCallback(async () => {
    try {
      const response = await socialImpactAdminService.getSponsors();
      setSponsors(response.sponsors);
    } catch (error: any) {
      console.error('Error fetching sponsors:', error);
      Alert.alert('Error', error.message || 'Failed to fetch sponsors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredSponsors(
        sponsors.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.brandCoinName.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredSponsors(sponsors);
    }
  }, [sponsors, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSponsors();
    setRefreshing(false);
  };

  const handleDeactivate = async (sponsor: Sponsor) => {
    Alert.alert(
      'Deactivate Sponsor',
      `Are you sure you want to deactivate ${sponsor.name}? They won't be able to sponsor new events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await socialImpactAdminService.deactivateSponsor(sponsor._id);
              Alert.alert('Success', 'Sponsor deactivated');
              fetchSponsors();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to deactivate');
            }
          },
        },
      ]
    );
  };

  const renderSponsorCard = ({ item, index }: { item: Sponsor; index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
        <TouchableOpacity
          style={[styles.sponsorCard, !item.isActive && styles.sponsorCardInactive]}
          onPress={() => router.push(`/sponsors/${item._id}`)}
          activeOpacity={0.8}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.logoContainer}>
              {item.logo ? (
                <Image source={{ uri: item.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={28} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.sponsorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.sponsorName}>{item.name}</Text>
                {!item.isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>
              <View style={styles.brandCoinRow}>
                <Ionicons name="sparkles" size={14} color="#8B5CF6" />
                <Text style={styles.brandCoinText}>{item.brandCoinName}</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalEventsSponsored}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalParticipants}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
                {item.totalCoinsDistributed.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Coins Given</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/sponsors/${item._id}`);
              }}
            >
              <Ionicons name="analytics" size={14} color="#3B82F6" />
              <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/sponsors/${item._id}/edit`);
              }}
            >
              <Ionicons name="pencil" size={14} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Edit</Text>
            </TouchableOpacity>
            {item.isActive && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deactivateButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeactivate(item);
                }}
              >
                <Ionicons name="close-circle" size={14} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Deactivate</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.title}>Sponsors</Text>
                  <Text style={styles.subtitle}>
                    {sponsors.length} {sponsors.length === 1 ? 'sponsor' : 'sponsors'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/sponsors/add')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sponsors..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading sponsors...</Text>
            </View>
          ) : filteredSponsors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No sponsors found' : 'No sponsors yet'}
              </Text>
              <Text style={styles.emptyDescription}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first sponsor to start managing CSR partnerships.'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/sponsors/add')}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Add First Sponsor</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredSponsors}
              renderItem={renderSponsorCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
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
    height: 280,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sponsorCard: {
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
  sponsorCardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sponsorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  brandCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  brandCoinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 4,
  },
  viewButton: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  editButton: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  deactivateButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
