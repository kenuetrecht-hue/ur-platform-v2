/**
 * Onboarding Context
 * Manages onboarding state and persistence across app lifecycle
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Development mode: set to false to properly initialize the app
// Setting to true bypasses onboarding and can cause initialization failures
const DEV_SKIP_ONBOARDING = false;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserAgreement {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  educationalDisclaimerAccepted: boolean;
  dataProcessingAccepted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  userAgreement: UserAgreement | null;
  completeOnboarding: (agreement: UserAgreement) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userAgreement, setUserAgreement] = useState<UserAgreement | null>(null);

  // Load onboarding status on mount
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        // Skip onboarding in development mode
        if (DEV_SKIP_ONBOARDING) {
          setHasCompletedOnboarding(true);
          setIsLoading(false);
          console.log("[DEV MODE] Skipping onboarding screen for preview");
          return;
        }

        const stored = await AsyncStorage.getItem("onboarding_completed");
        const agreementStored = await AsyncStorage.getItem("user_agreement");

        if (stored === "true") {
          setHasCompletedOnboarding(true);
          if (agreementStored) {
            const agreement = JSON.parse(agreementStored);
            // Convert timestamp string back to Date
            agreement.timestamp = new Date(agreement.timestamp);
            setUserAgreement(agreement);
          }
        }
      } catch (error) {
        console.error("Failed to load onboarding status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboardingStatus();
  }, []);

  const completeOnboarding = async (agreement: UserAgreement) => {
    try {
      // Skip storage in dev mode
      if (!DEV_SKIP_ONBOARDING) {
        // Save completion status
        await AsyncStorage.setItem("onboarding_completed", "true");

        // Save user agreement
        await AsyncStorage.setItem("user_agreement", JSON.stringify(agreement));
      }

      // Update state
      setUserAgreement(agreement);
      setHasCompletedOnboarding(true);

      console.log("Onboarding completed and saved");
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem("onboarding_completed");
      await AsyncStorage.removeItem("user_agreement");

      setHasCompletedOnboarding(false);
      setUserAgreement(null);

      console.log("Onboarding reset");
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
      throw error;
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        isLoading,
        userAgreement,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
