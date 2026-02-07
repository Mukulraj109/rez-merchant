import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'table-bookings',
    title: 'Table Bookings',
    subtitle: 'View and manage reservations across all stores',
    icon: 'calendar-outline',
    iconColor: '#10B981',
    route: '/all-table-bookings',
  },
  {
    id: 'stores',
    title: 'My Stores',
    subtitle: 'Manage your stores, settings, and details',
    icon: 'storefront-outline',
    iconColor: '#3B82F6',
    route: '/stores',
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'Create and manage events',
    icon: 'ticket-outline',
    iconColor: '#8B5CF6',
    route: '/events',
  },
  {
    id: 'social-impact',
    title: 'Social Impact',
    subtitle: 'Manage social impact initiatives',
    icon: 'heart-outline',
    iconColor: '#EC4899',
    route: '/social-impact',
  },
  {
    id: 'sponsors',
    title: 'Sponsors',
    subtitle: 'Manage sponsor partnerships',
    icon: 'people-outline',
    iconColor: '#F59E0B',
    route: '/sponsors',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'View alerts and manage preferences',
    icon: 'notifications-outline',
    iconColor: '#EF4444',
    route: '/notifications',
  },
  {
    id: 'reports',
    title: 'Reports',
    subtitle: 'Generate business reports and exports',
    icon: 'document-text-outline',
    iconColor: '#6366F1',
    route: '/reports',
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>More Options</Text>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${item.iconColor}15` }]}>
                <Ionicons name={item.icon} size={24} color={item.iconColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  menuList: {
    gap: 10,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
