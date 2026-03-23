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

interface DeliveryZone {
  _id: string;
  name: string;
  radiusKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  estimatedTime: number;
  freeDeliveryAbove?: number;
  isDefault?: boolean;
}

interface ZoneForm {
  name: string;
  radiusKm: string;
  deliveryFee: string;
  minOrderAmount: string;
  estimatedTime: string;
  freeDeliveryAbove: string;
  isDefault: boolean;
}

const getDefaultForm = (): ZoneForm => ({
  name: '',
  radiusKm: '',
  deliveryFee: '',
  minOrderAmount: '0',
  estimatedTime: '30',
  freeDeliveryAbove: '',
  isDefault: false,
});

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

export default function DeliveryZonesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);
  const handleBack = useSafeBack(storeId);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(getDefaultForm());
  const [saving, setSaving] = useState(false);
  const [currentRadius, setCurrentRadius] = useState<number>(0);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const storeData = await storeService.getStoreById(storeId);
      const deliveryZones = (storeData as any).deliveryZones || [];
      setZones(deliveryZones);
      setCurrentRadius(storeData.location?.deliveryRadius || 0);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load zones:', error);
      showAlert('Error', error.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) loadZones();
  }, [storeId, loadZones]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      return showAlert('Validation', 'Zone name is required');
    }
    const radiusKm = parseFloat(form.radiusKm);
    if (isNaN(radiusKm) || radiusKm <= 0) {
      return showAlert('Validation', 'Radius must be greater than 0');
    }
    const deliveryFee = parseFloat(form.deliveryFee);
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      return showAlert('Validation', 'Delivery fee must be 0 or more');
    }

    try {
      setSaving(true);
      const zoneData: Partial<DeliveryZone> = {
        name: form.name.trim(),
        radiusKm,
        deliveryFee,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        estimatedTime: parseInt(form.estimatedTime) || 30,
        freeDeliveryAbove: form.freeDeliveryAbove ? parseFloat(form.freeDeliveryAbove) : undefined,
        isDefault: form.isDefault,
      };

      let updatedZones = [...zones];

      if (editingZone) {
        // Update existing zone
        updatedZones = updatedZones.map(z =>
          z._id === editingZone._id ? { ...z, ...zoneData } : z
        );
      } else {
        // Add new zone
        const newZone: DeliveryZone = {
          _id: `zone_${Date.now()}`,
          ...zoneData as DeliveryZone,
        };
        updatedZones.push(newZone);
      }

      // If this zone is default, unset others
      if (zoneData.isDefault) {
        const currentId = editingZone?._id || `zone_${Date.now()}`;
        updatedZones = updatedZones.map(z => ({
          ...z,
          isDefault: z._id === currentId ? true : false,
        }));
      }

      await storeService.updateStore(storeId, { deliveryZones: updatedZones } as any);
      showAlert('Success', editingZone ? 'Zone updated' : 'Zone added');
      setShowModal(false);
      setEditingZone(null);
      setForm(getDefaultForm());
      loadZones();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (zone: DeliveryZone) => {
    showConfirm(
      'Delete Zone',
      `Delete "${zone.name}"? This cannot be undone.`,
      async () => {
        try {
          const updatedZones = zones.filter(z => z._id !== zone._id);
          await storeService.updateStore(storeId, { deliveryZones: updatedZones } as any);
          showAlert('Success', 'Zone deleted');
          loadZones();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete zone');
        }
      }
    );
  };

  const openEditModal = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      radiusKm: zone.radiusKm.toString(),
      deliveryFee: zone.deliveryFee.toString(),
      minOrderAmount: zone.minOrderAmount.toString(),
      estimatedTime: zone.estimatedTime.toString(),
      freeDeliveryAbove: zone.freeDeliveryAbove?.toString() || '',
      isDefault: zone.isDefault || false,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingZone(null);
    setForm(getDefaultForm());
    setShowModal(true);
  };

  const renderZoneCard = useCallback(({ item, index }: { item: DeliveryZone; index: number }) => (
    <View style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <View style={styles.zoneIconWrap}>
          <Ionicons name="location" size={20} color={Colors.light.primary} />
        </View>
        <View style={styles.zoneHeaderInfo}>
          <View style={styles.zoneNameRow}>
            <Text style={styles.zoneName}>{item.name}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>DEFAULT</Text>
              </View>
            )}
          </View>
          <Text style={styles.zoneRadius}>{item.radiusKm} km radius</Text>
        </View>
      </View>

      <View style={styles.zoneDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={14} color="#6B7280" />
          <Text style={styles.detailLabel}>Fee:</Text>
          <Text style={styles.detailValue}>
            {item.deliveryFee === 0 ? 'Free' : `$${item.deliveryFee.toFixed(2)}`}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cart-outline" size={14} color="#6B7280" />
          <Text style={styles.detailLabel}>Min Order:</Text>
          <Text style={styles.detailValue}>${item.minOrderAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.detailLabel}>ETA:</Text>
          <Text style={styles.detailValue}>{item.estimatedTime} min</Text>
        </View>
        {item.freeDeliveryAbove != null && item.freeDeliveryAbove > 0 && (
          <View style={styles.detailItem}>
            <Ionicons name="gift-outline" size={14} color="#059669" />
            <Text style={[styles.detailLabel, { color: '#059669' }]}>Free above:</Text>
            <Text style={[styles.detailValue, { color: '#059669' }]}>${item.freeDeliveryAbove.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.zoneActions}>
        <TouchableOpacity
          style={styles.zoneActionBtn}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={15} color={Colors.light.primary} />
          <Text style={[styles.zoneActionText, { color: Colors.light.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoneActionBtn, { backgroundColor: '#FEF2F2' }]}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.light.danger} />
          <Text style={[styles.zoneActionText, { color: Colors.light.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [zones]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Delivery Zones</Text>
            {store?.name && <Text style={styles.headerSubtitle} numberOfLines={1}>{store.name}</Text>}
          </View>
          <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Current Radius Info */}
      <View style={styles.radiusInfo}>
        <Ionicons name="navigate-circle-outline" size={20} color={Colors.light.info} />
        <Text style={styles.radiusText}>
          Store delivery radius: <Text style={styles.radiusBold}>{currentRadius} km</Text>
        </Text>
      </View>

      {/* Zone List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading zones...</Text>
        </View>
      ) : (
        <FlatList
          data={zones}
          renderItem={renderZoneCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="map-outline" size={36} color={Colors.light.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Delivery Zones</Text>
              <Text style={styles.emptySubtitle}>Configure delivery zones with custom fees and minimum orders</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreateModal}>
                <Text style={styles.emptyBtnText}>Add Zone</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Zone Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingZone ? 'Edit Zone' : 'Add Zone'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Zone Name */}
              <Text style={styles.label}>Zone Name</Text>
              <TextInput
                style={styles.input}
                placeholder='e.g. "Zone 1 - 0-3km"'
                value={form.name}
                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                maxLength={100}
              />

              {/* Radius */}
              <Text style={styles.label}>Radius (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                value={form.radiusKm}
                onChangeText={(text) => setForm(prev => ({ ...prev, radiusKm: text }))}
                keyboardType="numeric"
              />

              {/* Delivery Fee */}
              <Text style={styles.label}>Delivery Fee ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2.50"
                value={form.deliveryFee}
                onChangeText={(text) => setForm(prev => ({ ...prev, deliveryFee: text }))}
                keyboardType="numeric"
              />

              {/* Min Order Amount */}
              <Text style={styles.label}>Minimum Order Amount ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10"
                value={form.minOrderAmount}
                onChangeText={(text) => setForm(prev => ({ ...prev, minOrderAmount: text }))}
                keyboardType="numeric"
              />

              {/* Estimated Time */}
              <Text style={styles.label}>Estimated Delivery Time (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 30"
                value={form.estimatedTime}
                onChangeText={(text) => setForm(prev => ({ ...prev, estimatedTime: text }))}
                keyboardType="numeric"
              />

              {/* Free Delivery Above */}
              <Text style={styles.label}>Free Delivery Above ($) — optional</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50"
                value={form.freeDeliveryAbove}
                onChangeText={(text) => setForm(prev => ({ ...prev, freeDeliveryAbove: text }))}
                keyboardType="numeric"
              />

              {/* Default Zone Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Default Zone</Text>
                <Switch
                  value={form.isDefault}
                  onValueChange={(val) => setForm(prev => ({ ...prev, isDefault: val }))}
                  trackColor={{ false: '#D1D5DB', true: Colors.light.primary }}
                  thumbColor="#fff"
                />
              </View>
              <Text style={styles.toggleHint}>Used when no other zone matches the customer location</Text>

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
                  <Text style={styles.saveBtnText}>
                    {editingZone ? 'Update Zone' : 'Add Zone'}
                  </Text>
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
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  radiusText: { fontSize: 13, color: '#1E40AF' },
  radiusBold: { fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  zoneIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneHeaderInfo: { flex: 1, marginLeft: 12 },
  zoneNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  defaultBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 9, fontWeight: '700', color: '#059669', letterSpacing: 0.5 },
  zoneRadius: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  zoneDetails: { gap: 6, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  zoneActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  zoneActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  zoneActionText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
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
    maxHeight: '90%',
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
