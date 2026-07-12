/**
 * Onboarding Backend Integration Service
 * Handles saving creator profiles to database after onboarding completion
 */

export interface CreatorProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  category: string;
  pricingModel: 'hourly' | 'monthly' | 'yearly';
  price: number;
  termsAccepted: boolean;
  createdAt: Date;
  status: 'pending_verification' | 'active' | 'suspended';
}

export interface OnboardingData {
  profile: {
    fullName: string;
    email: string;
    bio: string;
  };
  category: string;
  pricing: {
    model: 'hourly' | 'monthly' | 'yearly';
    price: number;
  };
  termsAccepted: boolean;
}

export class OnboardingBackendService {
  private profiles: Map<string, CreatorProfile> = new Map();
  private emailToId: Map<string, string> = new Map();

  /**
   * Save creator profile after onboarding completion
   */
  async saveCreatorProfile(data: OnboardingData): Promise<CreatorProfile> {
    const id = `creator_${Date.now()}`;
    
    if (!data.profile.fullName || !data.profile.email || !data.termsAccepted) {
      throw new Error('Missing required onboarding data');
    }

    if (this.emailToId.has(data.profile.email)) {
      throw new Error('Email already registered');
    }

    const profile: CreatorProfile = {
      id,
      fullName: data.profile.fullName,
      email: data.profile.email,
      bio: data.profile.bio,
      category: data.category,
      pricingModel: data.pricing.model,
      price: data.pricing.price,
      termsAccepted: data.termsAccepted,
      createdAt: new Date(),
      status: 'pending_verification',
    };

    this.profiles.set(id, profile);
    this.emailToId.set(data.profile.email, id);

    return profile;
  }

  /**
   * Get creator profile by ID
   */
  getCreatorProfile(id: string): CreatorProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Get creator profile by email
   */
  getCreatorByEmail(email: string): CreatorProfile | undefined {
    const id = this.emailToId.get(email);
    return id ? this.profiles.get(id) : undefined;
  }

  /**
   * Update creator profile status
   */
  updateCreatorStatus(id: string, status: CreatorProfile['status']): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;
    
    profile.status = status;
    return true;
  }

  /**
   * List all creators
   */
  listCreators(): CreatorProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get creator count
   */
  getCreatorCount(): number {
    return this.profiles.size;
  }

  /**
   * Delete creator profile (for testing)
   */
  deleteCreator(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;
    
    this.emailToId.delete(profile.email);
    this.profiles.delete(id);
    return true;
  }
}
