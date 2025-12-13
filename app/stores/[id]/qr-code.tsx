import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useStore } from '@/contexts/StoreContext';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import api from '@/services/api';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width - 80, 300);

interface QRCodeData {
  hasQR: boolean;
  code?: string;
  qrImageUrl?: string;
  isActive?: boolean;
  generatedAt?: string;
  storeName?: string;
}

export default function StoreQRCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
  const [confirmAction, setConfirmAction] = useState<'regenerate' | 'toggle' | null>(null);

  // Fetch QR code data
  const fetchQRData = useCallback(async () => {
    try {
      const response = await api.get(`/store-payment/qr/${storeId}`);
      if (response.data.success) {
        setQrData(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching QR data:', error);
      setErrorMessage({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to fetch QR code data',
      });
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchQRData();
  }, [fetchQRData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQRData();
  };

  // Generate QR code
  const generateQR = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/store-payment/generate-qr/${storeId}`);
      if (response.data.success) {
        setQrData({
          hasQR: true,
          code: response.data.data.code,
          qrImageUrl: response.data.data.qrImageUrl,
          isActive: true,
          generatedAt: response.data.data.generatedAt,
          storeName: store?.name,
        });
        setSuccessMessage({
          title: 'Success',
          message: 'QR code generated successfully!',
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      setErrorMessage({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to generate QR code',
      });
      setShowErrorModal(true);
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate QR code
  const regenerateQR = async () => {
    setGenerating(true);
    setShowConfirmModal(false);
    try {
      const response = await api.post(`/store-payment/regenerate-qr/${storeId}`);
      if (response.data.success) {
        setQrData({
          hasQR: true,
          code: response.data.data.code,
          qrImageUrl: response.data.data.qrImageUrl,
          isActive: true,
          generatedAt: response.data.data.generatedAt,
          storeName: store?.name,
        });
        setSuccessMessage({
          title: 'Success',
          message: 'New QR code generated. The old QR code is now invalid.',
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error regenerating QR:', error);
      setErrorMessage({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to regenerate QR code',
      });
      setShowErrorModal(true);
    } finally {
      setGenerating(false);
    }
  };

  // Toggle QR active status
  const toggleQRStatus = async () => {
    setToggling(true);
    setShowConfirmModal(false);
    try {
      const newStatus = !qrData?.isActive;
      const response = await api.patch(`/store-payment/qr/${storeId}/toggle`, {
        isActive: newStatus,
      });
      if (response.data.success) {
        setQrData(prev => prev ? { ...prev, isActive: newStatus } : null);
        setSuccessMessage({
          title: 'Success',
          message: `QR code ${newStatus ? 'activated' : 'deactivated'} successfully`,
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error toggling QR status:', error);
      setErrorMessage({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to toggle QR code status',
      });
      setShowErrorModal(true);
    } finally {
      setToggling(false);
    }
  };

  // Download QR code
  const downloadQR = async () => {
    if (!qrData?.qrImageUrl) return;

    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        // For web, open in new tab or trigger download
        const link = document.createElement('a');
        link.href = qrData.qrImageUrl;
        link.download = `${store?.name || 'store'}-qr-code.png`;
        link.click();
        setSuccessMessage({
          title: 'Success',
          message: 'QR code download started',
        });
        setShowSuccessModal(true);
      } else {
        // For native, download and save to gallery
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage({
            title: 'Permission Required',
            message: 'Please grant permission to save images to your gallery',
          });
          setShowErrorModal(true);
          return;
        }

        const filename = `${store?.name || 'store'}-qr-code.png`;
        const fileUri = FileSystem.documentDirectory + filename;

        const downloadResult = await FileSystem.downloadAsync(
          qrData.qrImageUrl,
          fileUri
        );

        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

        setSuccessMessage({
          title: 'Success',
          message: 'QR code saved to your gallery',
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error downloading QR:', error);
      setErrorMessage({
        title: 'Error',
        message: 'Failed to download QR code',
      });
      setShowErrorModal(true);
    } finally {
      setDownloading(false);
    }
  };

  // Share QR code
  const shareQR = async () => {
    if (!qrData?.qrImageUrl) return;

    try {
      if (Platform.OS === 'web') {
        // For web, use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: `${store?.name} - Payment QR Code`,
            text: `Scan this QR code to pay at ${store?.name}`,
            url: qrData.qrImageUrl,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(qrData.qrImageUrl);
          setSuccessMessage({
            title: 'Copied',
            message: 'QR code URL copied to clipboard',
          });
          setShowSuccessModal(true);
        }
      } else {
        // For native
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // Download first, then share
          const filename = `${store?.name || 'store'}-qr-code.png`;
          const fileUri = FileSystem.cacheDirectory + filename;

          await FileSystem.downloadAsync(qrData.qrImageUrl, fileUri);
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: `Share ${store?.name} QR Code`,
          });
        } else {
          // Fallback to Share API
          await Share.share({
            message: `Scan this QR code to pay at ${store?.name}: ${qrData.qrImageUrl}`,
            title: `${store?.name} - Payment QR Code`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error sharing QR:', error);
      if (error.name !== 'AbortError') {
        setErrorMessage({
          title: 'Error',
          message: 'Failed to share QR code',
        });
        setShowErrorModal(true);
      }
    }
  };

  // Handle confirm modal action
  const handleConfirmAction = () => {
    if (confirmAction === 'regenerate') {
      regenerateQR();
    } else if (confirmAction === 'toggle') {
      toggleQRStatus();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading QR code...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 20 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Store Info */}
        <View style={styles.storeInfoCard}>
          <View style={styles.storeIconContainer}>
            <Ionicons name="storefront" size={32} color={Colors.light.primary} />
          </View>
          <Text style={styles.storeName}>{store?.name || 'Your Store'}</Text>
          {qrData?.code && (
            <Text style={styles.qrCode}>Code: {qrData.code}</Text>
          )}
        </View>

        {/* QR Code Display or Generate Button */}
        {qrData?.hasQR && qrData?.qrImageUrl ? (
          <>
            {/* QR Code Card */}
            <View style={styles.qrCard}>
              <LinearGradient
                colors={qrData.isActive ? ['#10B981', '#059669'] : ['#6B7280', '#4B5563']}
                style={styles.statusBadge}
              >
                <Ionicons
                  name={qrData.isActive ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.statusText}>
                  {qrData.isActive ? 'Active' : 'Inactive'}
                </Text>
              </LinearGradient>

              <View style={styles.qrImageContainer}>
                <Image
                  source={{ uri: qrData.qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.scanInstruction}>
                Customers can scan this QR code to pay at your store
              </Text>

              {qrData.generatedAt && (
                <Text style={styles.generatedDate}>
                  Generated: {new Date(qrData.generatedAt).toLocaleDateString()}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={downloadQR}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : (
                  <Ionicons name="download-outline" size={24} color={Colors.light.primary} />
                )}
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={shareQR}
              >
                <Ionicons name="share-outline" size={24} color={Colors.light.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // TODO: Implement print functionality
                  setSuccessMessage({
                    title: 'Print',
                    message: 'Print functionality coming soon!',
                  });
                  setShowSuccessModal(true);
                }}
              >
                <Ionicons name="print-outline" size={24} color={Colors.light.primary} />
                <Text style={styles.actionButtonText}>Print</Text>
              </TouchableOpacity>
            </View>

            {/* Toggle and Regenerate */}
            <View style={styles.managementSection}>
              <TouchableOpacity
                style={[
                  styles.managementButton,
                  qrData.isActive ? styles.deactivateButton : styles.activateButton,
                ]}
                onPress={() => {
                  setConfirmAction('toggle');
                  setShowConfirmModal(true);
                }}
                disabled={toggling}
              >
                {toggling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name={qrData.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.managementButtonText}>
                      {qrData.isActive ? 'Deactivate QR' : 'Activate QR'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.managementButton, styles.regenerateButton]}
                onPress={() => {
                  setConfirmAction('regenerate');
                  setShowConfirmModal(true);
                }}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={20} color="#FFF" />
                    <Text style={styles.managementButtonText}>Regenerate QR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>How it works</Text>
                <Text style={styles.infoDescription}>
                  When customers scan your QR code with the ReZ app, they can:{'\n'}
                  {'\n'}Pay using UPI, cards, or ReZ coins
                  {'\n'}Redeem offers and earn cashback
                  {'\n'}Build loyalty and earn rewards
                </Text>
              </View>
            </View>
          </>
        ) : (
          /* No QR Code - Generate Button */
          <View style={styles.noQRContainer}>
            <View style={styles.noQRIcon}>
              <Ionicons name="qr-code-outline" size={80} color="#D1D5DB" />
            </View>
            <Text style={styles.noQRTitle}>No QR Code Yet</Text>
            <Text style={styles.noQRDescription}>
              Generate a unique QR code for your store to accept payments from customers using the ReZ app.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateQR}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.generateButtonText}>Generate QR Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setShowSuccessModal(false)}
      />

      <ErrorModal
        visible={showErrorModal}
        title={errorMessage.title}
        message={errorMessage.message}
        onClose={() => setShowErrorModal(false)}
      />

      <ConfirmModal
        visible={showConfirmModal}
        title={
          confirmAction === 'regenerate'
            ? 'Regenerate QR Code?'
            : qrData?.isActive
            ? 'Deactivate QR Code?'
            : 'Activate QR Code?'
        }
        message={
          confirmAction === 'regenerate'
            ? 'This will create a new QR code. The old QR code will stop working immediately. Customers with the old QR code will need to scan the new one.'
            : qrData?.isActive
            ? 'Deactivating will temporarily prevent customers from using this QR code to pay.'
            : 'Activating will allow customers to use this QR code to pay at your store.'
        }
        confirmText={confirmAction === 'regenerate' ? 'Regenerate' : qrData?.isActive ? 'Deactivate' : 'Activate'}
        confirmColor={confirmAction === 'regenerate' || !qrData?.isActive ? Colors.light.primary : '#EF4444'}
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  storeInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  qrCode: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  qrImageContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  scanInstruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  generatedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  managementSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  managementButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  activateButton: {
    backgroundColor: '#10B981',
  },
  deactivateButton: {
    backgroundColor: '#EF4444',
  },
  regenerateButton: {
    backgroundColor: '#6366F1',
  },
  managementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 20,
  },
  noQRContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noQRIcon: {
    marginBottom: 20,
  },
  noQRTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  noQRDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
