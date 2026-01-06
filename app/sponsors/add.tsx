import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';

import { socialImpactAdminService, CreateSponsorData } from '@/services/api/socialImpact';
import { uploadsService } from '@/services/api/uploads';
import { isWeb, handleWebImageUpload } from '@/utils/platform';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';

export default function AddSponsorScreen() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [brandCoinName, setBrandCoinName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Logo state
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  // Pick and upload logo
  const pickLogo = async () => {
    try {
      let result;

      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          result = {
            assets: [{ uri: webImages[0].uri, file: webImages[0].file }],
            canceled: false,
          };
        } else {
          return;
        }
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        const file = (result.assets[0] as any).file;
        setLogoUri(uri);
        await uploadLogo(uri, file);
      }
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to pick image',
      });
    }
  };

  const uploadLogo = async (uri: string, fileObject?: File) => {
    setUploadingLogo(true);
    try {
      const filename = uri.split('/').pop() || `sponsor-logo-${Date.now()}.jpg`;
      const response = await uploadsService.uploadImage(uri, filename, 'logo', fileObject);
      setLogoUrl(response.url);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Upload Error',
        message: error.message || 'Failed to upload logo',
      });
      setLogoUri(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoUri(null);
    setLogoUrl(null);
  };

  // Validation
  const validateForm = (): string | null => {
    if (!name.trim()) return 'Sponsor name is required';
    if (!brandCoinName.trim()) return 'Brand coin name is required';
    if (!logoUrl) return 'Logo is required';
    if (contactEmail.trim() && !contactEmail.includes('@')) {
      return 'Please enter a valid email address';
    }
    if (website.trim() && !website.startsWith('http')) {
      return 'Website URL should start with http:// or https://';
    }
    return null;
  };

  // Submit form
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErrorModal({
        visible: true,
        title: 'Validation Error',
        message: validationError,
      });
      return;
    }

    setLoading(true);
    try {
      const sponsorData: CreateSponsorData = {
        name: name.trim(),
        brandCoinName: brandCoinName.trim(),
        logo: logoUrl!,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
      };

      // Add contact person if any field is filled
      if (contactName.trim() || contactEmail.trim() || contactPhone.trim()) {
        sponsorData.contactPerson = {
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim() || undefined,
        };
      }

      await socialImpactAdminService.createSponsor(sponsorData);

      setSuccessModal({
        visible: true,
        title: 'Success!',
        message: 'Sponsor created successfully',
      });
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to create sponsor',
      });
    } finally {
      setLoading(false);
    }
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Sponsor</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Logo Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sponsor Logo *</Text>
                <TouchableOpacity
                  style={styles.logoPickerButton}
                  onPress={pickLogo}
                  disabled={uploadingLogo}
                >
                  {logoUri ? (
                    <View style={styles.logoPreviewContainer}>
                      <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                      {uploadingLogo && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator color="#FFFFFF" />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.removeLogoButton} onPress={removeLogo}>
                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
                      <Text style={styles.logoPlaceholderHint}>Square image recommended</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Basic Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sponsor Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Tata Group"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Brand Coin Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={brandCoinName}
                    onChangeText={setBrandCoinName}
                    placeholder="e.g., Tata Coins"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.inputHint}>
                    This is the name of coins users earn from this sponsor
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description about the sponsor..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Website</Text>
                  <TextInput
                    style={styles.textInput}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://www.example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Contact Person */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Person</Text>
                <Text style={styles.sectionSubtitle}>Optional - Add primary contact details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Contact person name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="contact@example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+91 XXXXX XXXXX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || uploadingLogo}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Create Sponsor</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Modals */}
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
          onClose={() => {
            setSuccessModal({ visible: false, title: '', message: '' });
            router.replace('/sponsors');
          }}
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
    height: 280,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -12,
    marginBottom: 16,
  },
  logoPickerButton: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 200,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  logoPlaceholderHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  logoPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
  },
  removeLogoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
