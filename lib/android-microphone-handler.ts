/**
 * Android Microphone Permission Handler
 * 
 * Handles microphone permission requests for Android devices (including Samsung)
 * Works with both Expo Go and web preview
 */

import { Platform } from "react-native";

interface PermissionStatus {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
  error?: string;
}

class AndroidMicrophoneHandler {
  /**
   * Request microphone permission on Android
   */
  static async requestMicrophonePermission(): Promise<PermissionStatus> {
    // Only relevant on Android
    if (Platform.OS !== "android") {
      return {
        granted: true,
        status: "granted",
      };
    }

    try {
      // Check if running in Expo Go
      if (typeof window === "undefined") {
        // Native Expo environment
        return this.requestNativePermission();
      }

      // Web environment (Chrome preview)
      return this.requestWebPermission();
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      return {
        granted: false,
        status: "denied",
        error: String(error),
      };
    }
  }

  /**
   * Request permission in native Expo Go environment
   */
  private static async requestNativePermission(): Promise<PermissionStatus> {
    try {
      // Try to use expo-permissions if available
      const { Audio } = require("expo-av");

      // Request microphone permission
      const permission = await Audio.requestPermissionsAsync();

      if (permission.granted) {
        return {
          granted: true,
          status: "granted",
        };
      } else {
        return {
          granted: false,
          status: "denied",
          error: "User denied microphone permission",
        };
      }
    } catch (error) {
      console.warn("Expo Audio permission request failed:", error);

      // Fallback: assume permission is granted in Expo Go
      return {
        granted: true,
        status: "granted",
      };
    }
  }

  /**
   * Request permission in web environment (Chrome preview)
   */
  private static async requestWebPermission(): Promise<PermissionStatus> {
    try {
      // Check if browser supports getUserMedia
      const getUserMedia =
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (!getUserMedia) {
        return {
          granted: false,
          status: "denied",
          error: "getUserMedia not supported in this browser",
        };
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach((track) => track.stop());

      return {
        granted: true,
        status: "granted",
      };
    } catch (error: any) {
      let errorMessage = "Unknown error";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone permission denied. Please allow microphone access in Chrome settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found on this device.";
      } else if (error.name === "NotReadableError") {
        errorMessage =
          "Microphone is already in use by another application.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Microphone access blocked by browser security policy.";
      }

      console.error("Web microphone permission error:", error);

      return {
        granted: false,
        status: "denied",
        error: errorMessage,
      };
    }
  }

  /**
   * Check if microphone permission is granted
   */
  static async checkMicrophonePermission(): Promise<PermissionStatus> {
    try {
      if (Platform.OS !== "android") {
        return {
          granted: true,
          status: "granted",
        };
      }

      // For web, try to get permission status
      if (typeof window !== "undefined" && navigator.permissions) {
        try {
          const result = await (navigator.permissions as any).query({
            name: "microphone",
          });

          return {
            granted: result.state === "granted",
            status: result.state,
          };
        } catch (error) {
          console.warn("Could not query microphone permission:", error);
        }
      }

      // Default: assume granted
      return {
        granted: true,
        status: "granted",
      };
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      return {
        granted: false,
        status: "denied",
        error: String(error),
      };
    }
  }

  /**
   * Get user-friendly error message for Samsung phones
   */
  static getSamsungErrorMessage(error: string): string {
    if (error.includes("NotAllowedError")) {
      return `📱 Samsung Microphone Permission\n\n1. Go to Chrome menu (⋮)\n2. Select "Settings"\n3. Tap "Site settings"\n4. Select "Microphone"\n5. Find this website and select "Allow"\n6. Refresh the page`;
    }

    if (error.includes("NotFoundError")) {
      return "No microphone detected. Please check your Samsung phone has a working microphone.";
    }

    if (error.includes("NotReadableError")) {
      return "Microphone is busy. Close other apps using the microphone and try again.";
    }

    return "Microphone access failed. Please check your phone settings.";
  }
}

export const androidMicrophoneHandler = AndroidMicrophoneHandler;
