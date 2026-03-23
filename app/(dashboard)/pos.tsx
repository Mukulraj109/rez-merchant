/**
 * Simple POS — 4-step point-of-sale flow for in-store billing.
 *
 * Step 1: Product Search & Cart
 * Step 2: Cart Review
 * Step 3: Customer & Payment
 * Step 4: Bill Created (receipt)
 *
 * Includes offline support via OfflineService: products are cached locally,
 * and bill creation is queued for sync when the device is offline.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import { useStore } from '@/contexts/StoreContext';
import { showAlert, showConfirm } from '@/utils/alert';
import { posService, POSProduct, POSCartItem, POSCustomer, CreateBillPayload, BillResponse } from '@/services/api/pos';
import { offlineService } from '@/services/offline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 1 | 2 | 3 | 4;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getProductPrice(p: POSProduct): number {
  if (p.pricing?.selling) return p.pricing.selling;
  if (typeof p.price === 'number') return p.price;
  return 0;
}

function getProductImage(p: POSProduct): string | null {
  if (!p.images?.length) return null;
  const main = p.images.find((i) => i.isMain);
  return (main ?? p.images[0])?.thumbnailUrl ?? (main ?? p.images[0])?.url ?? null;
}

function generateIdempotencyKey(): string {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function POSScreen() {
  const { activeStore } = useStore();
  const storeId = activeStore?._id ?? '';

  // ── Global state ────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [isOnline, setIsOnline] = useState(true);

  // ── Step 1 — product search & cart ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedProducts = useRef(false);

  // ── Step 3 — customer & payment ─────────────────────────────────────
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<POSCustomer | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [isCreatingBill, setIsCreatingBill] = useState(false);

  // ── Step 4 — bill result ────────────────────────────────────────────
  const [billResult, setBillResult] = useState<BillResponse | null>(null);
  const [isQueuedOffline, setIsQueuedOffline] = useState(false);

  // ── Network monitoring ──────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // ── Cart helpers ────────────────────────────────────────────────────
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + getProductPrice(item.product) * item.quantity, 0),
    [cart]
  );
  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const taxAmount = useMemo(() => Math.round(cartTotal * 0.05 * 100) / 100, [cartTotal]);
  const coinDiscount = useMemo(
    () => (redeemCoins ? Math.min(coinsToRedeem, cartTotal + taxAmount) : 0),
    [redeemCoins, coinsToRedeem, cartTotal, taxAmount]
  );
  const finalTotal = useMemo(
    () => Math.max(0, cartTotal + taxAmount - coinDiscount),
    [cartTotal, taxAmount, coinDiscount]
  );

  // ── Product search ─────────────────────────────────────────────────
  const searchProducts = useCallback(
    async (query: string) => {
      if (!storeId) return;

      // If offline, filter cached products locally
      if (!isOnline) {
        const cached = await offlineService.getCachedProducts();
        const q = query.toLowerCase().trim();
        const filtered = q
          ? cached.filter((p: any) => p.name?.toLowerCase().includes(q))
          : cached;
        setProducts(filtered as unknown as POSProduct[]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await posService.searchProducts(storeId, query, 1, 50);
        setProducts(result.products);

        // Cache products for offline use (store entire response)
        offlineService.cacheData({ products: result.products as any });
      } catch (err: any) {
        if (__DEV__) console.error('[POS] Search error:', err);
        // Fall back to cached products
        const cached = await offlineService.getCachedProducts();
        setProducts(cached as unknown as POSProduct[]);
      } finally {
        setIsSearching(false);
      }
    },
    [storeId, isOnline]
  );

  // Debounced search
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => searchProducts(text), 350);
    },
    [searchProducts]
  );

  // Load products on mount
  useEffect(() => {
    if (storeId && !hasLoadedProducts.current) {
      hasLoadedProducts.current = true;
      searchProducts('');
    }
  }, [storeId, searchProducts]);

  // ── Cart actions ────────────────────────────────────────────────────
  const addToCart = useCallback((product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product._id !== productId) return item;
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        })
        .filter(Boolean) as POSCartItem[];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  }, []);

  // ── Customer lookup ─────────────────────────────────────────────────
  const lookupCustomer = useCallback(async () => {
    if (!customerPhone.trim() || customerPhone.length < 10 || !storeId) return;

    if (!isOnline) {
      showAlert('Offline', 'Customer lookup requires an internet connection.');
      return;
    }

    setIsLookingUp(true);
    try {
      const found = await posService.lookupCustomer(customerPhone.trim(), storeId);
      setCustomer(found);
      if (found) {
        setCoinsToRedeem(0);
        setRedeemCoins(false);
      } else {
        showAlert('Not Found', 'No customer found with this phone number.');
      }
    } catch {
      showAlert('Error', 'Failed to look up customer.');
    } finally {
      setIsLookingUp(false);
    }
  }, [customerPhone, storeId, isOnline]);

  // ── Bill creation ───────────────────────────────────────────────────
  const createBill = useCallback(async () => {
    if (!storeId || cart.length === 0) return;

    const payload: CreateBillPayload = {
      storeId,
      items: cart.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        price: getProductPrice(item.product),
        quantity: item.quantity,
      })),
      subtotal: cartTotal,
      tax: taxAmount,
      total: finalTotal,
      paymentMethod,
      customerPhone: customerPhone.trim() || undefined,
      coinsRedeemed: coinDiscount > 0 ? coinsToRedeem : undefined,
      coinDiscount: coinDiscount > 0 ? coinDiscount : undefined,
      idempotencyKey: generateIdempotencyKey(),
    };

    // ── Offline path — queue for later sync ──
    if (!isOnline) {
      try {
        await offlineService.queueOfflineAction({
          type: 'CREATE_BILL',
          endpoint: '/api/store-payment/create-bill',
          method: 'POST',
          data: payload,
          maxRetries: 5,
        });
        setIsQueuedOffline(true);
        setStep(4);
      } catch {
        showAlert('Error', 'Failed to queue bill for offline sync.');
      }
      return;
    }

    // ── Online path ──
    setIsCreatingBill(true);
    try {
      const result = await posService.createBill(payload);
      setBillResult(result);
      setIsQueuedOffline(false);
      setStep(4);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create bill.');
    } finally {
      setIsCreatingBill(false);
    }
  }, [
    storeId, cart, cartTotal, taxAmount, finalTotal,
    paymentMethod, customerPhone, coinDiscount, coinsToRedeem, isOnline,
  ]);

  // ── Reset (new bill) ───────────────────────────────────────────────
  const resetPOS = useCallback(() => {
    setStep(1);
    setCart([]);
    setCustomerPhone('');
    setCustomer(null);
    setRedeemCoins(false);
    setCoinsToRedeem(0);
    setPaymentMethod('cash');
    setBillResult(null);
    setIsQueuedOffline(false);
  }, []);

  // ── Navigation guards ──────────────────────────────────────────────
  const goToStep2 = useCallback(() => {
    if (cart.length === 0) {
      showAlert('Empty Cart', 'Please add at least one product to the cart.');
      return;
    }
    setStep(2);
  }, [cart]);

  const goToStep3 = useCallback(() => setStep(3), []);
  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1) as Step), []);

  // ── Quantity in cart for a product ──────────────────────────────────
  const getCartQty = useCallback(
    (productId: string) => cart.find((i) => i.product._id === productId)?.quantity ?? 0,
    [cart]
  );

  // ═══════════════════════════════════════════════════════════════════
  // ── RENDER HELPERS ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const renderOfflineBanner = () => {
    if (isOnline) return null;
    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
        <Text style={styles.offlineBannerText}>
          You are offline. Bills will be queued for sync.
        </Text>
      </View>
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              s <= step ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          >
            {s < step ? (
              <Ionicons name="checkmark" size={12} color="#FFF" />
            ) : (
              <Text style={[styles.stepDotText, s <= step && styles.stepDotTextActive]}>
                {s}
              </Text>
            )}
          </View>
          {s < 4 && (
            <View
              style={[
                styles.stepLine,
                s < step ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // ── Step 1: Product Search & Cart ──────────────────────────────────
  const renderProductItem = useCallback(
    ({ item }: { item: POSProduct }) => {
      const price = getProductPrice(item);
      const qty = getCartQty(item._id);

      return (
        <View style={styles.productCard}>
          {/* Product image placeholder */}
          <View style={styles.productImageBox}>
            {getProductImage(item) ? (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="image-outline" size={24} color="#D1D5DB" />
              </View>
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={24} color="#D1D5DB" />
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.sku && (
              <Text style={styles.productSku}>SKU: {item.sku}</Text>
            )}
            <Text style={styles.productPrice}>
              {price.toFixed(2)}
            </Text>
          </View>

          <View style={styles.productAction}>
            {qty === 0 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.quantityStepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => updateQuantity(item._id, -1)}
                >
                  <Ionicons name="remove" size={16} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{qty}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => updateQuantity(item._id, 1)}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    },
    [addToCart, updateQuantity, getCartQty]
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name or SKU..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Product list */}
      {isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cube-outline" size={36} color="#7C3AED" />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term.' : 'Add products to your store first.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Cart summary bar */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={goToStep2}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cartBarGradient}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
              <Text style={styles.cartBarLabel}>
                {cartItemCount === 1 ? '1 item' : `${cartItemCount} items`}
              </Text>
            </View>
            <View style={styles.cartBarRight}>
              <Text style={styles.cartBarTotal}>{cartTotal.toFixed(2)}</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Step 2: Cart Review ────────────────────────────────────────────
  const renderStep2 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Cart Review</Text>

      {cart.map((item) => {
        const price = getProductPrice(item.product);
        return (
          <View key={item.product._id} style={styles.cartItemCard}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName} numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text style={styles.cartItemPrice}>
                {price.toFixed(2)} x {item.quantity} = {(price * item.quantity).toFixed(2)}
              </Text>
            </View>

            <View style={styles.cartItemActions}>
              <View style={styles.quantityStepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => updateQuantity(item.product._id, -1)}
                >
                  <Ionicons name="remove" size={16} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => updateQuantity(item.product._id, 1)}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() =>
                  showConfirm('Remove Item', `Remove "${item.product.name}" from cart?`, () =>
                    removeFromCart(item.product._id)
                  )
                }
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Totals */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{cartTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax (5%)</Text>
          <Text style={styles.totalValue}>{taxAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.totalRowFinal]}>
          <Text style={styles.totalLabelFinal}>Total</Text>
          <Text style={styles.totalValueFinal}>{(cartTotal + taxAmount).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={goToStep3}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step 3: Customer & Payment ─────────────────────────────────────
  const renderStep3 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Customer lookup */}
      <Text style={styles.sectionTitle}>Customer (Optional)</Text>
      <View style={styles.customerLookupRow}>
        <TextInput
          style={styles.phoneInput}
          placeholder="Phone number"
          placeholderTextColor="#9CA3AF"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          maxLength={15}
        />
        <TouchableOpacity
          style={[styles.lookupButton, isLookingUp && styles.lookupButtonDisabled]}
          onPress={lookupCustomer}
          disabled={isLookingUp || customerPhone.length < 10}
          activeOpacity={0.7}
        >
          {isLookingUp ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.lookupButtonText}>Lookup</Text>
          )}
        </TouchableOpacity>
      </View>

      {customer && (
        <View style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={18} color="#7C3AED" />
            <Text style={styles.customerName}>{customer.fullName}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="sparkles-outline" size={18} color="#F59E0B" />
            <Text style={styles.customerCoins}>
              {customer.availableCoins.toLocaleString()} coins available
            </Text>
          </View>

          {customer.availableCoins > 0 && (
            <View style={styles.redeemSection}>
              <TouchableOpacity
                style={styles.redeemToggle}
                onPress={() => {
                  setRedeemCoins(!redeemCoins);
                  if (!redeemCoins) {
                    setCoinsToRedeem(Math.min(customer.availableCoins, Math.floor(cartTotal + taxAmount)));
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    redeemCoins && styles.checkboxActive,
                  ]}
                >
                  {redeemCoins && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={styles.redeemLabel}>Redeem coins</Text>
              </TouchableOpacity>

              {redeemCoins && (
                <View style={styles.coinSliderContainer}>
                  <Text style={styles.coinSliderLabel}>
                    Coins to redeem: {coinsToRedeem}
                  </Text>
                  {/* Simple +/- stepper for coin amount */}
                  <View style={styles.coinAmountRow}>
                    <TouchableOpacity
                      style={styles.coinStepBtn}
                      onPress={() => setCoinsToRedeem(Math.max(0, coinsToRedeem - 10))}
                    >
                      <Ionicons name="remove" size={20} color="#7C3AED" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.coinAmountInput}
                      value={String(coinsToRedeem)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num)) {
                          setCoinsToRedeem(
                            Math.min(num, customer.availableCoins, Math.floor(cartTotal + taxAmount))
                          );
                        } else if (text === '') {
                          setCoinsToRedeem(0);
                        }
                      }}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.coinStepBtn}
                      onPress={() =>
                        setCoinsToRedeem(
                          Math.min(
                            coinsToRedeem + 10,
                            customer.availableCoins,
                            Math.floor(cartTotal + taxAmount)
                          )
                        )
                      }
                    >
                      <Ionicons name="add" size={20} color="#7C3AED" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.coinDiscountText}>
                    Discount: -{coinDiscount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Payment method */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Payment Method</Text>
      <View style={styles.paymentMethods}>
        {(['cash', 'upi', 'card'] as const).map((method) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            cash: 'cash-outline',
            upi: 'phone-portrait-outline',
            card: 'card-outline',
          };
          const labels: Record<string, string> = {
            cash: 'Cash',
            upi: 'UPI',
            card: 'Card',
          };

          return (
            <TouchableOpacity
              key={method}
              style={[
                styles.paymentMethodCard,
                paymentMethod === method && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod(method)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={icons[method]}
                size={24}
                color={paymentMethod === method ? '#7C3AED' : '#6B7280'}
              />
              <Text
                style={[
                  styles.paymentMethodLabel,
                  paymentMethod === method && styles.paymentMethodLabelActive,
                ]}
              >
                {labels[method]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{cartTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax (5%)</Text>
          <Text style={styles.totalValue}>{taxAmount.toFixed(2)}</Text>
        </View>
        {coinDiscount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#10B981' }]}>Coin Discount</Text>
            <Text style={[styles.totalValue, { color: '#10B981' }]}>
              -{coinDiscount.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.totalRowFinal]}>
          <Text style={styles.totalLabelFinal}>Final Amount</Text>
          <Text style={styles.totalValueFinal}>{finalTotal.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isCreatingBill && styles.primaryButtonDisabled]}
        onPress={createBill}
        disabled={isCreatingBill}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={isCreatingBill ? ['#A78BFA', '#A5B4FC'] : ['#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          {isCreatingBill ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create Bill</Text>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step 4: Bill Created ───────────────────────────────────────────
  const renderStep4 = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={[styles.scrollContent, styles.receiptContainer]}
      showsVerticalScrollIndicator={false}
    >
      {isQueuedOffline ? (
        // Offline queued state
        <>
          <View style={[styles.receiptIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cloud-offline-outline" size={40} color="#F59E0B" />
          </View>
          <Text style={styles.receiptTitle}>Queued for Sync</Text>
          <Text style={styles.receiptSubtitle}>
            The bill has been saved locally and will be synced when you are back online.
          </Text>

          <View style={styles.receiptDetailsCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Items</Text>
              <Text style={styles.receiptValue}>{cartItemCount}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total</Text>
              <Text style={styles.receiptValue}>{finalTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment</Text>
              <Text style={styles.receiptValue}>{paymentMethod.toUpperCase()}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status</Text>
              <View style={styles.queuedBadge}>
                <Text style={styles.queuedBadgeText}>Pending Sync</Text>
              </View>
            </View>
          </View>
        </>
      ) : billResult ? (
        // Online success state
        <>
          <View style={styles.receiptIconCircle}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </View>
          <Text style={styles.receiptTitle}>Bill Created</Text>
          <Text style={styles.receiptSubtitle}>
            Transaction completed successfully.
          </Text>

          <View style={styles.receiptDetailsCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Reference</Text>
              <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                {billResult.referenceNumber}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total</Text>
              <Text style={styles.receiptValue}>{billResult.total.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment</Text>
              <Text style={styles.receiptValue}>
                {billResult.paymentMethod.toUpperCase()}
              </Text>
            </View>
            {billResult.coinsRedeemed > 0 && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Coins Used</Text>
                <Text style={[styles.receiptValue, { color: '#EF4444' }]}>
                  -{billResult.coinsRedeemed}
                </Text>
              </View>
            )}
            {billResult.coinsIssued > 0 && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Coins Earned</Text>
                <Text style={[styles.receiptValue, { color: '#10B981' }]}>
                  +{billResult.coinsIssued}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, { marginTop: 24 }]}
        onPress={resetPOS}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFF" />
          <Text style={styles.primaryButtonText}>New Bill</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════════
  // ── MAIN RENDER ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  if (!activeStore) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="storefront-outline" size={36} color="#7C3AED" />
          </View>
          <Text style={styles.emptyTitle}>No Store Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a store from the header to use POS.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderOfflineBanner()}

        {/* Header */}
        <View style={styles.header}>
          {step > 1 && step < 4 && (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {step === 1 && 'Point of Sale'}
            {step === 2 && 'Cart Review'}
            {step === 3 && 'Payment'}
            {step === 4 && 'Receipt'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── STYLES ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },

  // ── Offline banner ──
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    width: 36,
  },

  // ── Step indicator ──
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#7C3AED',
  },
  stepDotInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepDotTextActive: {
    color: '#FFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#7C3AED',
  },
  stepLineInactive: {
    backgroundColor: '#E5E7EB',
  },

  // ── Step container ──
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },

  // ── Product list ──
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  productImageBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productSku: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  productAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Add / stepper buttons ──
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#FFF',
  },
  addButtonText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },

  // ── Cart bar ──
  cartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  cartBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cartBarLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartBarTotal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Cart items (step 2) ──
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Totals ──
  totalsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  // ── Primary button ──
  primaryButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Customer ──
  customerLookupRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lookupButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupButtonDisabled: {
    opacity: 0.6,
  },
  lookupButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  customerCoins: {
    fontSize: 14,
    color: '#6B7280',
  },

  // ── Coin redemption ──
  redeemSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  redeemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  redeemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  coinSliderContainer: {
    marginTop: 10,
  },
  coinSliderLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  coinAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  coinStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinAmountInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  coinDiscountText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },

  // ── Payment methods ──
  paymentMethods: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  paymentMethodCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
  },
  paymentMethodLabelActive: {
    color: '#7C3AED',
  },

  // ── Receipt (step 4) ──
  receiptContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  receiptIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  receiptSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  receiptDetailsCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  receiptLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  queuedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  queuedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },

  // ── Common ──
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
});
