import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventService, Event, EventCategory, UpdateEventData } from '@/services/api/events';
import { uploadsService } from '@/services/api/uploads';
import { Colors } from '@/constants/Colors';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';
import { isWeb, handleWebImageUpload } from '@/utils/platform';

const CATEGORIES: EventCategory[] = [
  'Music',
  'Technology',
  'Wellness',
  'Sports',
  'Education',
  'Business',
  'Arts',
  'Food',
  'Entertainment',
  'Other',
];

const CATEGORY_ICONS: Record<EventCategory, string> = {
  Music: 'musical-notes',
  Technology: 'hardware-chip',
  Wellness: 'fitness',
  Sports: 'football',
  Education: 'school',
  Business: 'briefcase',
  Arts: 'color-palette',
  Food: 'restaurant',
  Entertainment: 'game-controller',
  Other: 'ellipsis-horizontal',
};

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Other');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Date & Time
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState('10:00');
  const [endTime, setEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Location
  const [isOnline, setIsOnline] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');

  // Pricing
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');

  // Organizer
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');

  // Additional
  const [maxCapacity, setMaxCapacity] = useState('');
  const [minAge, setMinAge] = useState('');
  const [tags, setTags] = useState('');
  const [requirements, setRequirements] = useState('');
  const [includes, setIncludes] = useState('');
  const [registrationRequired, setRegistrationRequired] = useState(false);

  // Category picker
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Modal states
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const event = await eventService.getEventById(id as string);
      populateForm(event);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to load event',
      });
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (event: Event) => {
    setTitle(event.title);
    setSubtitle(event.subtitle || '');
    setDescription(event.description);
    setCategory(event.category);

    if (event.image) {
      setImageUri(event.image);
      setImageUrl(event.image);
    }

    // Date & Time
    setEventDate(new Date(event.date));
    setEventTime(event.time);
    setEndTime(event.endTime || '');

    // Location
    setIsOnline(event.isOnline);
    setLocationName(event.location.name);
    setAddress(event.location.address);
    setCity(event.location.city);
    setState(event.location.state || '');
    setMeetingUrl(event.location.meetingUrl || '');

    // Pricing
    setIsFree(event.price.isFree);
    setPrice(event.price.amount?.toString() || '');
    setOriginalPrice(event.price.originalPrice?.toString() || '');

    // Organizer
    setOrganizerName(event.organizer.name);
    setOrganizerEmail(event.organizer.email);
    setOrganizerPhone(event.organizer.phone || '');

    // Additional
    setMaxCapacity(event.maxCapacity?.toString() || '');
    setMinAge(event.minAge?.toString() || '');
    setTags(event.tags?.join(', ') || '');
    setRequirements(event.requirements?.join('\n') || '');
    setIncludes(event.includes?.join('\n') || '');
    setRegistrationRequired(event.registrationRequired);
  };

  const handleSelectImage = async () => {
    try {
      let result;
      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          result = {
            assets: [{
              uri: webImages[0].uri,
              file: webImages[0].file
            }],
            canceled: false
          };
        } else {
          return;
        }
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const file = (result.assets[0] as any).file;
        setImageUri(uri);
        setUploadingImage(true);

        try {
          const filename = uri.split('/').pop() || `event-${Date.now()}.jpg`;
          const uploadResult = await uploadsService.uploadImage(uri, filename, 'general', file);
          setImageUrl(uploadResult.url);
        } catch (error: any) {
          setErrorModal({
            visible: true,
            title: 'Upload Error',
            message: error.message || 'Failed to upload image',
          });
          setImageUri(null);
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to select image',
      });
    }
  };

  const formatDateForApi = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Title is required' });
      return;
    }
    if (!description.trim()) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Description is required' });
      return;
    }
    if (!imageUrl) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Event image is required' });
      return;
    }
    if (!organizerName.trim() || !organizerEmail.trim()) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Organizer name and email are required' });
      return;
    }
    if (!isOnline && (!locationName.trim() || !address.trim() || !city.trim())) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Location details are required for in-person events' });
      return;
    }
    if (isOnline && !meetingUrl.trim()) {
      setErrorModal({ visible: true, title: 'Validation Error', message: 'Meeting URL is required for online events' });
      return;
    }

    try {
      setSaving(true);

      const eventData: UpdateEventData = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim(),
        image: imageUrl,
        category,
        date: formatDateForApi(eventDate),
        time: eventTime,
        endTime: endTime || undefined,
        isOnline,
        location: {
          name: locationName.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim() || undefined,
          isOnline,
          meetingUrl: isOnline ? meetingUrl.trim() : undefined,
        },
        price: {
          amount: isFree ? 0 : parseFloat(price) || 0,
          currency: '₹',
          isFree,
          originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        },
        organizer: {
          name: organizerName.trim(),
          email: organizerEmail.trim(),
          phone: organizerPhone.trim() || undefined,
        },
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
        minAge: minAge ? parseInt(minAge) : undefined,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        requirements: requirements.trim() ? requirements.split('\n').map(r => r.trim()).filter(Boolean) : undefined,
        includes: includes.trim() ? includes.split('\n').map(i => i.trim()).filter(Boolean) : undefined,
        registrationRequired,
      };

      await eventService.updateEvent(id as string, eventData);

      setSuccessModal({
        visible: true,
        title: 'Success!',
        message: 'Event updated successfully',
      });

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to update event',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Event</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Image */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Image *</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handleSelectImage}
                disabled={uploadingImage}
              >
                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    {uploadingImage && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.uploadingText}>Uploading...</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        setImageUri(null);
                        setImageUrl(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                    <Text style={styles.imageHint}>Recommended: 1200x675px (16:9)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Event title"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subtitle</Text>
                <TextInput
                  style={styles.textInput}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder="Short subtitle (optional)"
                  maxLength={150}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your event..."
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <View style={styles.categorySelected}>
                    <Ionicons
                      name={CATEGORY_ICONS[category] as any}
                      size={20}
                      color={Colors.light.primary}
                    />
                    <Text style={styles.categorySelectorText}>{category}</Text>
                  </View>
                  <Ionicons
                    name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={styles.categoryList}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryItem,
                          category === cat && styles.categoryItemSelected,
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Ionicons
                          name={CATEGORY_ICONS[cat] as any}
                          size={20}
                          color={category === cat ? Colors.light.primary : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.categoryItemText,
                            category === cat && styles.categoryItemTextSelected,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date & Time</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Date *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={Colors.light.primary} />
                  <Text style={styles.dateButtonText}>
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setEventDate(date);
                    }}
                  />
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={eventTime}
                    onChangeText={setEventTime}
                    placeholder="10:00"
                    maxLength={5}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="18:00"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !isOnline && styles.toggleButtonActive]}
                  onPress={() => setIsOnline(false)}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color={!isOnline ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.toggleText, !isOnline && styles.toggleTextActive]}>
                    In-Person
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isOnline && styles.toggleButtonActive]}
                  onPress={() => setIsOnline(true)}
                >
                  <Ionicons
                    name="videocam"
                    size={20}
                    color={isOnline ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.toggleText, isOnline && styles.toggleTextActive]}>
                    Online
                  </Text>
                </TouchableOpacity>
              </View>

              {isOnline ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Meeting URL *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={meetingUrl}
                    onChangeText={setMeetingUrl}
                    placeholder="https://zoom.us/j/..."
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Venue Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={locationName}
                      onChangeText={setLocationName}
                      placeholder="e.g., Convention Center"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Street address"
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>City *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>State</Text>
                      <TextInput
                        style={styles.textInput}
                        value={state}
                        onChangeText={setState}
                        placeholder="State"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Pricing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing</Text>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, isFree && styles.toggleButtonActive]}
                  onPress={() => setIsFree(true)}
                >
                  <Ionicons
                    name="gift"
                    size={20}
                    color={isFree ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.toggleText, isFree && styles.toggleTextActive]}>
                    Free
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !isFree && styles.toggleButtonActive]}
                  onPress={() => setIsFree(false)}
                >
                  <Ionicons
                    name="cash"
                    size={20}
                    color={!isFree ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.toggleText, !isFree && styles.toggleTextActive]}>
                    Paid
                  </Text>
                </TouchableOpacity>
              </View>

              {!isFree && (
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Price (₹) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={price}
                      onChangeText={setPrice}
                      placeholder="499"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Original Price</Text>
                    <TextInput
                      style={styles.textInput}
                      value={originalPrice}
                      onChangeText={setOriginalPrice}
                      placeholder="999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Organizer */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizer Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organizer Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={organizerName}
                  onChangeText={setOrganizerName}
                  placeholder="Organization or person name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={organizerEmail}
                  onChangeText={setOrganizerEmail}
                  placeholder="contact@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={organizerPhone}
                  onChangeText={setOrganizerPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Additional Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Settings</Text>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Max Capacity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={maxCapacity}
                    onChangeText={setMaxCapacity}
                    placeholder="100"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Min Age</Text>
                  <TextInput
                    style={styles.textInput}
                    value={minAge}
                    onChangeText={setMinAge}
                    placeholder="18"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags</Text>
                <TextInput
                  style={styles.textInput}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="workshop, beginner, free food"
                />
                <Text style={styles.inputHint}>Separate tags with commas</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Requirements</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={requirements}
                  onChangeText={setRequirements}
                  placeholder="Bring laptop&#10;Valid ID required"
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.inputHint}>One requirement per line</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>What's Included</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={includes}
                  onChangeText={setIncludes}
                  placeholder="Free lunch&#10;Certificate&#10;Workshop materials"
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.inputHint}>One item per line</Text>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setRegistrationRequired(!registrationRequired)}
                >
                  <Ionicons
                    name={registrationRequired ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={registrationRequired ? Colors.light.primary : '#9CA3AF'}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Registration required</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomNav />

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ visible: false, title: '', message: '' })}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ visible: false, title: '', message: '' })}
        autoCloseDelay={1500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 32,
  },
  section: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
  },
  imagePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  imagePlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  imageHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categorySelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySelectorText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryList: {
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  categoryItemSelected: {
    backgroundColor: `${Colors.light.primary}15`,
  },
  categoryItemText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryItemTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
