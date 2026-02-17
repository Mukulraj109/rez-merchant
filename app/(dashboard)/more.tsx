import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { StoreSelector } from '@/components/stores/StoreSelector';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  route: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const router = useRouter();
  const { activeStore } = useStore();
  const { logout } = useAuth();

  const creatorAnalyticsRoute = activeStore?._id
    ? `/stores/${activeStore._id}/creator-analytics`
    : '/stores';

  const SECTIONS: MenuSection[] = [
    {
      title: 'Store Management',
      items: [
        {
          id: 'stores',
          title: 'My Stores',
          subtitle: 'Manage stores, settings & details',
          icon: 'storefront',
          iconBg: '#EFF6FF',
          iconColor: '#3B82F6',
          route: '/stores',
        },
        {
          id: 'visits',
          title: 'Visits',
          subtitle: 'Track customer visits & check-ins',
          icon: 'calendar',
          iconBg: '#ECFDF5',
          iconColor: '#10B981',
          route: '/(dashboard)/visits',
        },
        {
          id: 'table-bookings',
          title: 'Table Bookings',
          subtitle: 'View reservations across all stores',
          icon: 'restaurant',
          iconBg: '#FEF3C7',
          iconColor: '#D97706',
          route: '/all-table-bookings',
        },
        {
          id: 'categories',
          title: 'Business Categories',
          subtitle: 'Manage product & service categories',
          icon: 'grid',
          iconBg: '#F0FDFA',
          iconColor: '#14B8A6',
          route: '/categories',
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          id: 'cashback',
          title: 'Cashback',
          subtitle: 'Manage cashback offers & redemptions',
          icon: 'gift',
          iconBg: '#FEF2F2',
          iconColor: '#EF4444',
          route: '/(dashboard)/cashback',
        },
        {
          id: 'wallet',
          title: 'Wallet',
          subtitle: 'View balance, transactions & payouts',
          icon: 'wallet',
          iconBg: '#EFF6FF',
          iconColor: '#3B82F6',
          route: '/(dashboard)/wallet',
        },
        {
          id: 'coins',
          title: 'Coins',
          subtitle: 'Manage branded & ReZ coin rewards',
          icon: 'sparkles',
          iconBg: '#FFFBEB',
          iconColor: '#F59E0B',
          route: '/(dashboard)/coins',
        },
        {
          id: 'deals',
          title: 'Deals',
          subtitle: 'Create and manage deals & offers',
          icon: 'ticket',
          iconBg: '#FDF4FF',
          iconColor: '#A855F7',
          route: '/(dashboard)/deals',
        },
      ],
    },
    {
      title: 'Marketing & Creators',
      items: [
        {
          id: 'creator-picks',
          title: 'Creator Picks',
          subtitle: 'Review & approve creator product picks',
          icon: 'star',
          iconBg: '#F5F3FF',
          iconColor: '#8B5CF6',
          route: creatorAnalyticsRoute,
          badge: 'NEW',
        },
        {
          id: 'events',
          title: 'Events',
          subtitle: 'Create and manage events',
          icon: 'megaphone',
          iconBg: '#FDF4FF',
          iconColor: '#A855F7',
          route: '/events',
        },
        {
          id: 'sponsors',
          title: 'Sponsors',
          subtitle: 'Manage sponsor partnerships',
          icon: 'people',
          iconBg: '#FFFBEB',
          iconColor: '#F59E0B',
          route: '/sponsors',
        },
        {
          id: 'social-impact',
          title: 'Social Impact',
          subtitle: 'Manage social impact initiatives',
          icon: 'heart',
          iconBg: '#FDF2F8',
          iconColor: '#EC4899',
          route: '/social-impact',
        },
      ],
    },
    {
      title: 'Team & Security',
      items: [
        {
          id: 'team',
          title: 'Team',
          subtitle: 'Manage team members & permissions',
          icon: 'people-circle',
          iconBg: '#EDE9FE',
          iconColor: '#7C3AED',
          route: '/(dashboard)/team',
        },
        {
          id: 'audit',
          title: 'Audit Log',
          subtitle: 'View security & activity logs',
          icon: 'shield-checkmark',
          iconBg: '#DBEAFE',
          iconColor: '#2563EB',
          route: '/(dashboard)/audit',
        },
      ],
    },
    {
      title: 'Business Tools',
      items: [
        {
          id: 'services',
          title: 'Services',
          subtitle: 'Manage travel & service listings',
          icon: 'briefcase',
          iconBg: '#F0F9FF',
          iconColor: '#0EA5E9',
          route: '/services',
        },
        {
          id: 'reports',
          title: 'Reports',
          subtitle: 'Generate business reports & exports',
          icon: 'document-text',
          iconBg: '#EEF2FF',
          iconColor: '#6366F1',
          route: '/reports',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'View alerts & manage preferences',
          icon: 'notifications',
          iconBg: '#FEF2F2',
          iconColor: '#EF4444',
          route: '/notifications',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>More Options</Text>
          <View style={styles.storeSelectorWrap}>
            <StoreSelector compact />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCards}>
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuCard,
                    iIdx === section.items.length - 1 && styles.menuCardLast,
                  ]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={22} color={item.iconColor} />
                  </View>
                  <View style={styles.menuText}>
                    <View style={styles.menuTitleRow}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      {item.badge && (
                        <View style={styles.menuBadge}>
                          <Text style={styles.menuBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.6}
        >
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 40) + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  storeSelectorWrap: {
    flexShrink: 0,
    maxWidth: '50%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCards: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Menu card
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuCardLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 14,
  },
});
