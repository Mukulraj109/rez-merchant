const config = {
  expo: {
    name: "Rez Merchant App",
    slug: "rez-merchant-app",
    version: "1.0.0",
    description: "Complete merchant management solution for Rez platform. Manage products, orders, analytics, team, and more.",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rez-merchant",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    primaryColor: "#7C3AED",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#7C3AED"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rez.merchant",
      buildNumber: "1",
      requireFullScreen: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSExceptionMinimumTLSVersion: "1.0",
              NSIncludesSubdomains: true
            }
          }
        },
        NSCameraUsageDescription: "Allow Rez Merchant to use your camera to scan barcodes and take product photos.",
        NSPhotoLibraryUsageDescription: "Allow Rez Merchant to access your photo library to upload product images.",
        NSPhotoLibraryAddUsageDescription: "Allow Rez Merchant to save product images to your photo library."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#7C3AED"
      },
      edgeToEdgeEnabled: true,
      package: "com.rez.merchant",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE"
      ]
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png",
      name: "Rez Merchant",
      shortName: "Rez Merchant",
      lang: "en",
      themeColor: "#7C3AED",
      backgroundColor: "#ffffff"
    },
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Rez Merchant to access your photo library to upload product images.",
          cameraPermission: "Allow Rez Merchant to use your camera to scan barcodes and take product photos."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#7C3AED"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        appDir: "app"
      },
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api',
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT || '60000',
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5001',
      socketTimeout: process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '5000',
      privacyPolicyUrl: "https://rezmerchant.com/privacy",
      termsOfServiceUrl: "https://rezmerchant.com/terms",
      supportEmail: "support@rezmerchant.com",
      eas: {
        projectId: "77203219-4cd5-4ca3-9210-1cc89b7456fc"
      }
    }
  }
};

export default config;
