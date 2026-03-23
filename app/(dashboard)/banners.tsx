import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { apiClient } from '@/services/api/client';
import { uploadsService } from '@/services/api/uploads';
import { useStore } from '@/contexts/StoreContext';
import { showAlert, showConfirm } from '@/utils/alert';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';

interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  target: 'store_page' | 'home_page' | 'category_page';
  startDate: string;
  endDate: string;
  isActive: boolean;
  views: number;
  storeId: string;
  storeName: string;
  status: 'active' | 'scheduled' | 'expired' | 'inactive';
  createdAt: string;
}

interface BannerForm {
  title: string;
  imageUrl: string;
  linkUrl: string;
  target: 'store_page' | 'home_page' | 'category_page';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const TARGET_OPTIONS = [
  { value: 'store_page', label: 'Store Page' },
  { value: 'home_page', label: 'Home Page' },
  { value: 'category_page', label: 'Category Page' },
] as const;

const STATUS_FILTERS = ['all', 'active', 'scheduled', 'expired', 'inactive'] as const;

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: '#ECFDF5', text: '#059669' },
  scheduled: { bg: '#EFF6FF', text: '#2563EB' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  inactive: { bg: '#FEF2F2', text: '#DC2626' },
};

const getDefaultForm = (): BannerForm => ({
  title: '',
  imageUrl: '',
  linkUrl: '',
  target: 'store_page',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  isActive: true,
});

export default function BannersScreen() {
  const router = useRouter();
  const { activeStore, stores } = useStore();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(getDefaultForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadBanners = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params: any = { page: pageNum, limit: 20, status: filter };
      if (activeStore?._id) params.storeId = activeStore._id;
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get<any>(`merchant/banners?${queryString}`);
      const data = response.data;
      const newBanners = data?.banners || [];

      if (append) {
        setBanners(prev => [...prev, ...newBanners]);
      } else {
        setBanners(newBanners);
      }

      const pagination = data?.pagination;
      setHasMore(pagination?.hasNextPage ?? false);
      setPage(pageNum);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load banners:', error);
      showAlert('Error', error.message || 'Failed to load banners');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStore?._id, filter]);

  useEffect(() => {
    loadBanners(1);
  }, [loadBanners]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBanners(1);
  }, [loadBanners]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadBanners(page + 1, true);
    }
  }, [hasMore, loading, page, loadBanners]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const uploaded = await uploadsService.uploadImage(
          asset.uri,
          `banner_${Date.now()}.jpg`,
          'banner',
          Platform.OS === 'web' ? (asset as any).file : undefined
        );
        setForm(prev => ({ ...prev, imageUrl: uploaded.url }));
        setUploading(false);
      }
    } catch (error: any) {
      setUploading(false);
      showAlert('Upload Error', error.message || 'Failed to upload image');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      return showAlert('Validation', 'Title is required');
    }
    if (!form.imageUrl) {
      return showAlert('Validation', 'Banner image is required');
    }
    if (!activeStore?._id) {
      return showAlert('Error', 'Please select a store first');
    }

    try {
      setSaving(true);
      if (editingBanner) {
        await apiClient.put(`merchant/banners/${editingBanner._id}`, {
          ...form,
          storeId: editingBanner.storeId,
        });
        showAlert('Success', 'Banner updated successfully');
      } else {
        await apiClient.post('merchant/banners', {
          ...form,
          storeId: activeStore._id,
        });
        showAlert('Success', 'Banner created successfully');
      }
      setShowModal(false);
      setEditingBanner(null);
      setForm(getDefaultForm());
      loadBanners(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (banner: Banner) => {
    showConfirm(
      'Delete Banner',
      `Are you sure you want to delete "${banner.title}"?`,
      async () => {
        try {
          await apiClient.delete(`merchant/banners/${banner._id}?storeId=${banner.storeId}`);
          showAlert('Success', 'Banner deleted');
          loadBanners(1);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete banner');
        }
      }
    );
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      target: banner.target,
      startDate: banner.startDate.split('T')[0],
      endDate: banner.endDate.split('T')[0],
      isActive: banner.isActive,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setForm(getDefaultForm());
    setShowModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderBannerCard = useCallback(({ item }: { item: Banner }) => {
    const colors = statusColors[item.status] || statusColors.inactive;
    return (
      <View style={styles.bannerCard}>
        <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} contentFit="cover" />
        <View style={styles.bannerInfo}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.bannerStore} numberOfLines={1}>{item.storeName}</Text>
          <View style={styles.bannerMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{item.views} views</Text>
            </View>
          </View>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color={Colors.light.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.light.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
              <Text style={[styles.actionBtnText, { color: Colors.light.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a3a52', '#2d5a7b']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Promotional Banners</Text>
          <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Chips */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Banner List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading banners...</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBannerCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ paddingVertical: 16 }} color={Colors.light.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={36} color={Colors.light.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Banners Yet</Text>
              <Text style={styles.emptySubtitle}>Create your first promotional banner to attract customers</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreateModal}>
                <Text style={styles.emptyBtnText}>Create Banner</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingBanner ? 'Edit Banner' : 'Create Banner'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Banner title"
                value={form.title}
                onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                maxLength={100}
              />

              {/* Image Upload */}
              <Text style={styles.label}>Banner Image</Text>
              <TouchableOpacity style={styles.imageUpload} onPress={handlePickImage} activeOpacity={0.7}>
                {uploading ? (
                  <ActivityIndicator color={Colors.light.primary} />
                ) : form.imageUrl ? (
                  <Image source={{ uri: form.imageUrl }} style={styles.uploadedImage} contentFit="cover" />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.uploadText}>Tap to upload image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Link URL */}
              <Text style={styles.label}>Link URL (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={form.linkUrl}
                onChangeText={(text) => setForm(prev => ({ ...prev, linkUrl: text }))}
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* Target */}
              <Text style={styles.label}>Target Page</Text>
              <View style={styles.targetRow}>
                {TARGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.targetChip, form.target === opt.value && styles.targetChipActive]}
                    onPress={() => setForm(prev => ({ ...prev, target: opt.value }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.targetChipText, form.target === opt.value && styles.targetChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Schedule */}
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

              {/* Active Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(val) => setForm(prev => ({ ...prev, isActive: val }))}
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
                  <Text style={styles.saveBtnText}>
                    {editingBanner ? 'Update Banner' : 'Create Banner'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1, marginLeft: 12 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  bannerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bannerImage: { width: '100%', height: 160, backgroundColor: '#F3F4F6' },
  bannerInfo: { padding: 14 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bannerStore: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  bannerMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  bannerActions: { flexDirection: 'row', gap: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F4F6' },
  deleteBtn: { backgroundColor: '#FEF2F2' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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
  imageUpload: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadedImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 6 },
  uploadText: { fontSize: 13, color: '#9CA3AF' },
  targetRow: { flexDirection: 'row', gap: 8 },
  targetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  targetChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  targetChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  targetChipTextActive: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
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
