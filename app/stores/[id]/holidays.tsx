import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { storeService } from '@/services/api/stores';
import { useStore } from '@/contexts/StoreContext';
import { showAlert, showConfirm } from '@/utils/alert';
import { Colors } from '@/constants/Colors';

interface Holiday {
  _id: string;
  startDate: string;
  endDate: string;
  reason: string;
  affectsAllOutlets?: boolean;
}

interface HolidayForm {
  startDate: string;
  endDate: string;
  reason: string;
  affectsAllOutlets: boolean;
}

const REASON_PRESETS = [
  'National Holiday',
  'Religious Holiday',
  'Staff Day Off',
  'Renovation',
  'Annual Maintenance',
  'Inventory Day',
  'Custom',
];

const getDefaultForm = (): HolidayForm => {
  const today = new Date().toISOString().split('T')[0];
  return {
    startDate: today,
    endDate: today,
    reason: '',
    affectsAllOutlets: false,
  };
};

const useSafeBack = (storeId: string) => {
  const router = useRouter();
  const navigation = useNavigation();
  return () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace(`/stores/${storeId}/details`);
    }
  };
};

export default function HolidaysScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);
  const handleBack = useSafeBack(storeId);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<HolidayForm>(getDefaultForm());
  const [saving, setSaving] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const storeData = await storeService.getStoreById(storeId);
      const storeHolidays = (storeData as any).holidays || [];
      // Sort by startDate (upcoming first)
      storeHolidays.sort(
        (a: Holiday, b: Holiday) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      setHolidays(storeHolidays);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load holidays:', error);
      showAlert('Error', error.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) loadHolidays();
  }, [storeId, loadHolidays]);

  const handleSave = async () => {
    const reason = selectedReason === 'Custom' ? form.reason.trim() : (selectedReason || form.reason.trim());
    if (!reason) {
      return showAlert('Validation', 'Please select or enter a reason');
    }
    if (!form.startDate || !form.endDate) {
      return showAlert('Validation', 'Start and end dates are required');
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return showAlert('Validation', 'End date must be on or after start date');
    }

    try {
      setSaving(true);
      const newHoliday: Holiday = {
        _id: `holiday_${Date.now()}`,
        startDate: form.startDate,
        endDate: form.endDate,
        reason,
        affectsAllOutlets: form.affectsAllOutlets,
      };

      const updatedHolidays = [...holidays, newHoliday];
      await storeService.updateStore(storeId, { holidays: updatedHolidays } as any);
      showAlert('Success', 'Holiday added');
      setShowModal(false);
      setForm(getDefaultForm());
      setSelectedReason(null);
      loadHolidays();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (holiday: Holiday) => {
    showConfirm(
      'Delete Holiday',
      `Remove "${holiday.reason}" closure?`,
      async () => {
        try {
          const updatedHolidays = holidays.filter(h => h._id !== holiday._id);
          await storeService.updateStore(storeId, { holidays: updatedHolidays } as any);
          showAlert('Success', 'Holiday removed');
          loadHolidays();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to remove holiday');
        }
      }
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getHolidayStatus = (holiday: Holiday): { label: string; color: string; bg: string } => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(holiday.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(holiday.endDate);
    end.setHours(23, 59, 59, 999);

    if (now >= start && now <= end) {
      return { label: 'Closed Today', color: '#DC2626', bg: '#FEF2F2' };
    }
    if (start > now) {
      return { label: 'Upcoming', color: '#2563EB', bg: '#EFF6FF' };
    }
    return { label: 'Past', color: '#6B7280', bg: '#F3F4F6' };
  };

  // Separate upcoming and past
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingHolidays = holidays.filter(h => new Date(h.endDate) >= now);
  const pastHolidays = holidays.filter(h => new Date(h.endDate) < now);

  const renderHolidayCard = useCallback(({ item }: { item: Holiday }) => {
    const status = getHolidayStatus(item);
    const isSingleDay = item.startDate === item.endDate ||
      item.startDate.split('T')[0] === item.endDate.split('T')[0];

    return (
      <View style={styles.holidayCard}>
        <View style={styles.holidayLeft}>
          <View style={[styles.dateBadge, { borderLeftColor: status.color }]}>
            <Text style={styles.dateDay}>
              {new Date(item.startDate).getDate()}
            </Text>
            <Text style={styles.dateMonth}>
              {new Date(item.startDate).toLocaleDateString('en-IN', { month: 'short' })}
            </Text>
          </View>
        </View>
        <View style={styles.holidayInfo}>
          <View style={styles.holidayTopRow}>
            <Text style={styles.holidayReason} numberOfLines={1}>{item.reason}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.holidayDates}>
            {isSingleDay
              ? formatDate(item.startDate)
              : `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
            }
          </Text>
          {item.affectsAllOutlets && (
            <View style={styles.outletsBadge}>
              <Ionicons name="business-outline" size={12} color="#7C3AED" />
              <Text style={styles.outletsText}>All outlets</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteIconBtn}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
        </TouchableOpacity>
      </View>
    );
  }, [holidays]);

  // Calendar highlights
  const highlightedDates = holidays.reduce((acc: Record<string, string>, h) => {
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      const status = getHolidayStatus(h);
      acc[key] = status.color;
      current.setDate(current.getDate() + 1);
    }
    return acc;
  }, {});

  // Generate current month calendar grid
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays: Array<{ day: number | null; dateKey: string }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ day: null, dateKey: '' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, dateKey });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Holidays & Closures</Text>
            {store?.name && <Text style={styles.headerSubtitle} numberOfLines={1}>{store.name}</Text>}
          </View>
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mini Calendar */}
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>
            {today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={styles.weekDay}>{d}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((item, i) => {
              const highlightColor = item.dateKey ? highlightedDates[item.dateKey] : undefined;
              const isToday = item.day === today.getDate();
              return (
                <View key={i} style={styles.calendarCell}>
                  {item.day !== null ? (
                    <View style={[
                      styles.calendarDay,
                      highlightColor ? { backgroundColor: highlightColor } : undefined,
                      isToday && !highlightColor ? styles.todayDay : undefined,
                    ]}>
                      <Text style={[
                        styles.calendarDayText,
                        highlightColor ? { color: '#fff' } : undefined,
                        isToday && !highlightColor ? { color: Colors.light.primary, fontWeight: '700' } : undefined,
                      ]}>
                        {item.day}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Upcoming Holidays */}
        {upcomingHolidays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Closures ({upcomingHolidays.length})</Text>
            {upcomingHolidays.map((h) => (
              <View key={h._id}>
                {renderHolidayCard({ item: h })}
              </View>
            ))}
          </View>
        )}

        {/* Past Holidays */}
        {pastHolidays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Closures ({pastHolidays.length})</Text>
            {pastHolidays.map((h) => (
              <View key={h._id}>
                {renderHolidayCard({ item: h })}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading holidays...</Text>
          </View>
        ) : holidays.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={36} color={Colors.light.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Holidays Scheduled</Text>
            <Text style={styles.emptySubtitle}>
              Add closures so customers know when you are unavailable
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Add Holiday</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Holiday Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Holiday</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); setSelectedReason(null); }}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Date Range */}
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.startDate}
                    onChangeText={(text) => setForm(prev => ({ ...prev, startDate: text }))}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.label}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.endDate}
                    onChangeText={(text) => setForm(prev => ({ ...prev, endDate: text }))}
                  />
                </View>
              </View>

              {/* Reason Presets */}
              <Text style={styles.label}>Reason</Text>
              <View style={styles.reasonGrid}>
                {REASON_PRESETS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonChip, selectedReason === reason && styles.reasonChipActive]}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.reasonChipText,
                      selectedReason === reason && styles.reasonChipTextActive,
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Reason Input */}
              {selectedReason === 'Custom' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Enter custom reason"
                  value={form.reason}
                  onChangeText={(text) => setForm(prev => ({ ...prev, reason: text }))}
                  maxLength={200}
                />
              )}

              {/* Affects All Outlets Toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Affects All Outlets</Text>
                  <Text style={styles.toggleHint}>Close all branches for this holiday</Text>
                </View>
                <Switch
                  value={form.affectsAllOutlets}
                  onValueChange={(val) => setForm(prev => ({ ...prev, affectsAllOutlets: val }))}
                  trackColor={{ false: '#D1D5DB', true: Colors.light.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Holiday</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  // Calendar
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDay: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDay: { borderWidth: 2, borderColor: Colors.light.primary },
  calendarDayText: { fontSize: 13, color: '#374151' },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Holiday card
  holidayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayLeft: { marginRight: 12 },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
  },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#111827' },
  dateMonth: { fontSize: 10, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  holidayInfo: { flex: 1 },
  holidayTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holidayReason: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  holidayDates: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  outletsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F5F3FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  outletsText: { fontSize: 11, color: '#7C3AED', fontWeight: '500' },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  reasonChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  reasonChipTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  toggleHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  saveBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
