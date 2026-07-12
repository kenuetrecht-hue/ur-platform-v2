import AsyncStorage from "@react-native-async-storage/async-storage";

// ==================== TYPES ====================

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface Creator {
  id: string;
  name: string;
  username: string;
  bio: string;
  photo: string;
  category: string;
  tier: TierName;
  verified: boolean;
  members: number;
  minutePrice?: number;
  hourPrice?: number;
  weekPrice?: number;
  monthlyPrice: number;
  yearPrice?: number;
  messagePrice: number;
  followers: number;
  posts: number;
  joinedDate: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  isAdmin?: boolean;
  credentials?: Array<{
    title: string;
    verified: boolean;
    verificationDate?: string;
    expiryDate?: string;
  }>;
  isAiBot?: boolean;
}

export interface Conversation {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  isPaidChat: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  isAiBotMessage?: boolean;
  affiliateLinks?: Array<{ url: string; partnerId: string }>;
  audioUrl?: string;
  videoUrl?: string;
  audioTranscription?: string;
  mediaDuration?: number;
}

export interface Transaction {
  id: string;
  type: "tip" | "subscription" | "deposit" | "withdrawal" | "earning" | "refund";
  amount: number;
  description: string;
  date: string;
  status: "completed" | "pending" | "failed";
  creatorId?: string;
  creatorName?: string;
}

export interface Contest {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  prize: string;
  endsAt: string;
  entries: number;
  active: boolean;
}

export interface Giveaway {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  prize: string;
  endsAt: string;
  entries: number;
  active: boolean;
}

export interface VideoCall {
  id: string;
  creatorId: string;
  followerId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "pending" | "active" | "completed" | "cancelled";
  price: number;
  recordingUrl?: string;
  recordingConsent: boolean;
}

export interface LiveStream {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  streamUrl: string;
  viewerCount: number;
  isLive: boolean;
  recordingUrl?: string;
  scheduledFor?: string;
  quality: "720p" | "1080p" | "4k";
  tips: number;
}

export interface VideoPost {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  monetized: boolean;
  price?: number;
  affiliateLinks?: Array<{ url: string; partnerId: string }>;
}

export interface AudioContent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  plays: number;
  likes: number;
  series?: string;
  transcription?: string;
  monetized: boolean;
  price?: number;
  affiliateLinks?: Array<{ url: string; partnerId: string }>;
}

export interface VideoTutorial {
  id: string;
  aiBotId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  category: string;
  createdAt: string;
  views: number;
  likes: number;
  interactive: boolean;
  monetized: boolean;
  price?: number;
  affiliateLinks?: Array<{ url: string; partnerId: string }>;
  series?: string;
}

export interface VideoComment {
  id: string;
  videoPostId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: string;
  likes: number;
  replies: VideoComment[];
}

export interface StreamAnalytics {
  streamId: string;
  creatorId: string;
  totalViewers: number;
  peakViewers: number;
  averageWatchTime: number;
  totalTips: number;
  engagementRate: number;
  recordingUrl?: string;
}

export interface ReferralRecord {
  id: string;
  referredName: string;
  date: string;
  status: "pending" | "active";
  earned: number;
}

export interface Lead {
  id: string;
  service: string;
  /** Full owner name */
  name: string;
  /** Business name */
  businessName: string;
  /** Phone number */
  phone: string;
  email: string;
  date: string;
  status: "submitted" | "contacted" | "signed-up" | "active";
  /** True once Ken has manually forwarded this lead to RMS */
  forwarded?: boolean;
  monthlyValue?: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  description: string;
  date: string;
  status: "pending" | "reviewed" | "resolved";
}

export interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  bio: string;
  isCreator: boolean;
  isAdmin: boolean;
  tier: TierName;
  points: number;
  balance: number;
  ageVerified: boolean;
  joinedDate: string;
  trialEndsAt?: string;
  referralCode: string;
  earnings?: number;
  loyaltyPoints: number;
  stickers: Array<{
    id: string;
    packId: string;
    name: string;
    imageUrl: string;
  }>;
  lastStarterPackDate?: string;
}

export type PartnerSlot =
  | "founder_card"
  | "wallet_tools"
  | "profile_partners"
  | "discover_banner"
  | "onboarding"
  | "contest_sponsor";

export const PARTNER_SLOTS: PartnerSlot[] = [
  "founder_card",
  "wallet_tools",
  "profile_partners",
  "discover_banner",
  "onboarding",
  "contest_sponsor",
];

export const PARTNER_SLOT_LABELS: Record<PartnerSlot, string> = {
  founder_card: "Founder's Note (Home)",
  wallet_tools: "Wallet → Tools for creators",
  profile_partners: "Profile → Partners I trust",
  discover_banner: "Discover banner",
  onboarding: "Onboarding setup step",
  contest_sponsor: "Contest prize sponsor",
};

export interface Partner {
  id: string;
  name: string;
  tagline: string;
  category: string;
  url: string;
  payoutNote: string; // e.g. "$10 per signup" or "15% recurring"
  slots: PartnerSlot[];
  enabled: boolean; // Ken toggles ON once he's approved + has the link
  clicks: number; // tracked locally for the Admin performance card
}

export interface FeatureFlags {
  contestsEnabled: boolean;
  giveawaysEnabled: boolean;
  videoUploadsEnabled: boolean;
  cryptoEnabled: boolean;
  collaborationEnabled: boolean;
  schedulingEnabled: boolean;
}

// ==================== TIER SYSTEM ====================

export const TIERS = {
  Bronze: { min: 0, max: 99, color: "#CD7F32", perks: ["Standard support", "Welcome bonus"] },
  Silver: { min: 100, max: 499, color: "#A8A8B8", perks: ["5% off all tips", "Priority support", "Silver badge"] },
  Gold: { min: 500, max: 999, color: "#FFD700", perks: ["10% off all tips", "Free monthly chat", "Gold badge", "Early access"] },
  Platinum: { min: 1000, max: Infinity, color: "#E5E4E2", perks: ["15% off all tips", "Free monthly chat", "Platinum badge", "VIP support", "Exclusive contests"] },
};

export function calculateTier(points: number): TierName {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

export function pointsToNextTier(points: number): { next: TierName | null; needed: number; progress: number } {
  if (points >= 1000) return { next: null, needed: 0, progress: 1 };
  if (points >= 500) return { next: "Platinum", needed: 1000 - points, progress: (points - 500) / 500 };
  if (points >= 100) return { next: "Gold", needed: 500 - points, progress: (points - 100) / 400 };
  return { next: "Silver", needed: 100 - points, progress: points / 100 };
}

// ==================== MOCK DATA ====================

const MOCK_CREATORS: Creator[] = [
  {
    id: "c1",
    name: "Alex Rivera",
    username: "@alexfit",
    bio: "Certified personal trainer helping you reach your fitness goals. Daily workouts, nutrition tips, and motivation.",
    photo: "https://i.pravatar.cc/300?img=12",
    category: "Fitness",
    tier: "Gold",
    verified: true,
    members: 342,
    minutePrice: 0.99,
    hourPrice: 29.99,
    weekPrice: 49.99,
    monthlyPrice: 9.99,
    yearPrice: 99.99,
    messagePrice: 2.99,
    followers: 15400,
    posts: 287,
    joinedDate: "2024-03-15",
    socialLinks: { instagram: "@alexfit", youtube: "AlexFit" },
  },
  {
    id: "c2",
    name: "Maya Chen",
    username: "@mayamusic",
    bio: "Indie songwriter sharing original music, covers, and behind-the-scenes content with my community.",
    photo: "https://i.pravatar.cc/300?img=47",
    category: "Music",
    tier: "Platinum",
    verified: true,
    members: 891,
    minutePrice: 1.99,
    hourPrice: 49.99,
    weekPrice: 79.99,
    monthlyPrice: 14.99,
    yearPrice: 149.99,
    messagePrice: 3.99,
    followers: 42300,
    posts: 412,
    joinedDate: "2023-11-08",
    socialLinks: { instagram: "@mayamusic", youtube: "MayaChenMusic" },
  },
  {
    id: "c3",
    name: "Jordan Blake",
    username: "@jordancoach",
    bio: "Life coach and motivational speaker. Helping you build the mindset for success, one day at a time.",
    photo: "https://i.pravatar.cc/300?img=33",
    category: "Coaching",
    tier: "Silver",
    verified: false,
    members: 87,
    minutePrice: 2.99,
    hourPrice: 59.99,
    weekPrice: 99.99,
    monthlyPrice: 19.99,
    yearPrice: 199.99,
    messagePrice: 4.99,
    followers: 6200,
    posts: 134,
    joinedDate: "2024-08-22",
    socialLinks: { instagram: "@jordancoach" },
  },
  {
    id: "c4",
    name: "Sasha Kim",
    username: "@sashaart",
    bio: "Digital artist sharing my creative process, tutorials, and exclusive prints with members.",
    photo: "https://i.pravatar.cc/300?img=23",
    category: "Art",
    tier: "Gold",
    verified: true,
    members: 256,
    minutePrice: 0.99,
    hourPrice: 19.99,
    weekPrice: 39.99,
    monthlyPrice: 7.99,
    yearPrice: 79.99,
    messagePrice: 1.99,
    followers: 18900,
    posts: 523,
    joinedDate: "2024-01-12",
  },
  {
    id: "c5",
    name: "Marcus Lee",
    username: "@marcusgames",
    bio: "Pro gamer and streamer. Daily streams, gameplay tips, and exclusive tournaments for members.",
    photo: "https://i.pravatar.cc/300?img=68",
    category: "Gaming",
    tier: "Silver",
    verified: false,
    members: 124,
    minutePrice: 0.99,
    hourPrice: 9.99,
    weekPrice: 19.99,
    monthlyPrice: 4.99,
    yearPrice: 49.99,
    messagePrice: 1.49,
    followers: 9800,
    posts: 678,
    joinedDate: "2024-06-03",
  },
  {
    id: "c6",
    name: "Dr. Priya Patel",
    username: "@drpriya",
    bio: "Business strategist helping entrepreneurs scale. Weekly strategy sessions and exclusive resources.",
    photo: "https://i.pravatar.cc/300?img=45",
    category: "Business",
    tier: "Platinum",
    verified: true,
    members: 567,
    minutePrice: 4.99,
    hourPrice: 99.99,
    weekPrice: 199.99,
    monthlyPrice: 49.99,
    yearPrice: 499.99,
    messagePrice: 9.99,
    followers: 28100,
    posts: 234,
    joinedDate: "2023-09-17",
    socialLinks: { instagram: "@drpriya", youtube: "DrPriyaBusiness" },
  },
  {
    id: "c7",
    name: "Tina Rodriguez",
    username: "@tinawellness",
    bio: "Holistic wellness coach. Yoga, meditation, and mindfulness practices for a balanced life.",
    photo: "https://i.pravatar.cc/300?img=49",
    category: "Lifestyle",
    tier: "Gold",
    verified: true,
    members: 198,
    minutePrice: 0.99,
    hourPrice: 24.99,
    weekPrice: 49.99,
    monthlyPrice: 12.99,
    yearPrice: 129.99,
    messagePrice: 2.49,
    followers: 12700,
    posts: 345,
    joinedDate: "2024-04-29",
  },
  {
    id: "c8",
    name: "Ryan Foster",
    username: "@ryancooks",
    bio: "Home chef sharing easy weeknight recipes and meal prep tips. New recipes every week!",
    photo: "https://i.pravatar.cc/300?img=51",
    category: "Lifestyle",
    tier: "Bronze",
    verified: false,
    members: 42,
    minutePrice: 0.99,
    hourPrice: 9.99,
    weekPrice: 19.99,
    monthlyPrice: 4.99,
    yearPrice: 49.99,
    messagePrice: 1.99,
    followers: 3400,
    posts: 89,
    joinedDate: "2025-01-08",
  },
  {
    id: "bot_wellness",
    name: "AI Wellness Coach",
    username: "@aiwellness",
    bio: "Your personal AI wellness companion. Daily meditation guides, mental health tips, and wellness insights. ⚠️ FOR ENTERTAINMENT & EDUCATIONAL PURPOSES ONLY - Not professional medical or mental health advice.",
    photo: "https://i.pravatar.cc/300?img=70",
    category: "Wellness",
    tier: "Gold",
    verified: true,
    members: 1200,
    minutePrice: 0.50,
    hourPrice: 9.99,
    weekPrice: 19.99,
    monthlyPrice: 4.99,
    yearPrice: 49.99,
    messagePrice: 0.99,
    followers: 8900,
    posts: 500,
    joinedDate: "2026-05-01",
    isAiBot: true,
  },
  {
    id: "bot_fitness",
    name: "AI Fitness Trainer",
    username: "@aifitness",
    bio: "AI-powered fitness trainer with personalized workouts and nutrition advice. Get fit with science-backed plans. ⚠️ FOR ENTERTAINMENT & EDUCATIONAL PURPOSES ONLY - Not professional fitness or medical advice.",
    photo: "https://i.pravatar.cc/300?img=71",
    category: "Fitness",
    tier: "Gold",
    verified: true,
    members: 950,
    minutePrice: 0.50,
    hourPrice: 9.99,
    weekPrice: 19.99,
    monthlyPrice: 4.99,
    yearPrice: 49.99,
    messagePrice: 0.99,
    followers: 7200,
    posts: 480,
    joinedDate: "2026-05-01",
    isAiBot: true,
  },
  {
    id: "bot_creative",
    name: "AI Creative Mentor",
    username: "@aicreative",
    bio: "AI creative guide offering art tutorials, writing prompts, and design inspiration. Unlock your artistic potential. ⚠️ FOR ENTERTAINMENT & EDUCATIONAL PURPOSES ONLY.",
    photo: "https://i.pravatar.cc/300?img=72",
    category: "Art",
    tier: "Silver",
    verified: true,
    members: 780,
    minutePrice: 0.50,
    hourPrice: 7.99,
    weekPrice: 14.99,
    monthlyPrice: 3.99,
    yearPrice: 39.99,
    messagePrice: 0.99,
    followers: 5600,
    posts: 420,
    joinedDate: "2026-05-01",
    isAiBot: true,
  },
  {
    id: "bot_music",
    name: "AI Music Producer",
    username: "@aimusic",
    bio: "AI music production expert. Learn music theory, production techniques, and beat creation. ⚠️ FOR ENTERTAINMENT & EDUCATIONAL PURPOSES ONLY.",
    photo: "https://i.pravatar.cc/300?img=73",
    category: "Music",
    tier: "Silver",
    verified: true,
    members: 650,
    minutePrice: 0.50,
    hourPrice: 7.99,
    weekPrice: 14.99,
    monthlyPrice: 3.99,
    yearPrice: 39.99,
    messagePrice: 0.99,
    followers: 4800,
    posts: 390,
    joinedDate: "2026-05-01",
    isAiBot: true,
  },
  {
    id: "bot_life",
    name: "AI Life Coach",
    username: "@ailife",
    bio: "AI-powered life coach for personal development. Goal-setting, habit building, and motivation anytime. ⚠️ FOR ENTERTAINMENT & EDUCATIONAL PURPOSES ONLY - Not professional coaching or therapy.",
    photo: "https://i.pravatar.cc/300?img=74",
    category: "Coaching",
    tier: "Silver",
    verified: true,
    members: 820,
    minutePrice: 0.50,
    hourPrice: 7.99,
    weekPrice: 14.99,
    monthlyPrice: 3.99,
    yearPrice: 39.99,
    messagePrice: 0.99,
    followers: 6300,
    posts: 410,
    joinedDate: "2026-05-01",
    isAiBot: true,
  },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    creatorId: "c1",
    creatorName: "Alex Rivera",
    creatorPhoto: "https://i.pravatar.cc/300?img=12",
    lastMessage: "Welcome to my fitness community! Ready to crush your goals?",
    lastMessageTime: "2m",
    unread: 2,
    isPaidChat: true,
  },
  {
    id: "conv2",
    creatorId: "c2",
    creatorName: "Maya Chen",
    creatorPhoto: "https://i.pravatar.cc/300?img=47",
    lastMessage: "New song dropping tomorrow! Members get early access 🎵",
    lastMessageTime: "1h",
    unread: 1,
    isPaidChat: true,
  },
  {
    id: "conv3",
    creatorId: "c4",
    creatorName: "Sasha Kim",
    creatorPhoto: "https://i.pravatar.cc/300?img=23",
    lastMessage: "Thanks for the tip! Working on a new piece for you 🎨",
    lastMessageTime: "3h",
    unread: 0,
    isPaidChat: false,
  },
  {
    id: "conv4",
    creatorId: "c7",
    creatorName: "Tina Rodriguez",
    creatorPhoto: "https://i.pravatar.cc/300?img=49",
    lastMessage: "Morning meditation reminder: 5 minutes can change your day",
    lastMessageTime: "Yesterday",
    unread: 0,
    isPaidChat: true,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  conv1: [
    { id: "m1", conversationId: "conv1", senderId: "c1", text: "Welcome to my fitness community! Ready to crush your goals?", timestamp: "10:30 AM", isOwn: false },
    { id: "m2", conversationId: "conv1", senderId: "user", text: "Yes! Excited to be here. What's the best way to start?", timestamp: "10:32 AM", isOwn: true },
    { id: "m3", conversationId: "conv1", senderId: "c1", text: "Check out the beginner workout in my pinned posts. Start with 3 days a week!", timestamp: "10:35 AM", isOwn: false },
    { id: "m4", conversationId: "conv1", senderId: "c1", text: "And remember — consistency beats intensity every time 💪", timestamp: "10:36 AM", isOwn: false },
  ],
  conv2: [
    { id: "m5", conversationId: "conv2", senderId: "c2", text: "Hey! Thanks for joining my music community 🎵", timestamp: "2:15 PM", isOwn: false },
    { id: "m6", conversationId: "conv2", senderId: "user", text: "Love your latest single!", timestamp: "2:18 PM", isOwn: true },
    { id: "m7", conversationId: "conv2", senderId: "c2", text: "New song dropping tomorrow! Members get early access 🎵", timestamp: "3:42 PM", isOwn: false },
  ],
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "subscription", amount: -9.99, description: "Monthly chat - Alex Rivera", date: "2026-04-29", status: "completed", creatorId: "c1", creatorName: "Alex Rivera" },
  { id: "t2", type: "tip", amount: -5.00, description: "Tip to Sasha Kim", date: "2026-04-28", status: "completed", creatorId: "c4", creatorName: "Sasha Kim" },
  { id: "t3", type: "deposit", amount: 50.00, description: "Wallet top-up", date: "2026-04-25", status: "completed" },
  { id: "t4", type: "subscription", amount: -14.99, description: "Monthly chat - Maya Chen", date: "2026-04-22", status: "completed", creatorId: "c2", creatorName: "Maya Chen" },
  { id: "t5", type: "tip", amount: -10.00, description: "Tip to Maya Chen", date: "2026-04-20", status: "completed", creatorId: "c2", creatorName: "Maya Chen" },
];

const MOCK_CONTESTS: Contest[] = [
  { id: "ct1", creatorId: "c1", creatorName: "Alex Rivera", title: "30-Day Fitness Challenge", description: "Complete 30 days of workouts and win a free month of personal training!", prize: "1-month free training ($300 value)", endsAt: "2026-06-15", entries: 87, active: true },
  { id: "ct2", creatorId: "c2", creatorName: "Maya Chen", title: "Best Cover Song Contest", description: "Submit your cover of any of my songs. Winner gets featured!", prize: "Featured cover + $100 cash", endsAt: "2026-06-30", entries: 34, active: true },
];

const MOCK_GIVEAWAYS: Giveaway[] = [
  { id: "g1", creatorId: "c4", creatorName: "Sasha Kim", title: "Limited Edition Print Giveaway", description: "Free signed print for 5 lucky members!", prize: "Signed art print", endsAt: "2026-06-10", entries: 156, active: true },
  { id: "g2", creatorId: "c6", creatorName: "Dr. Priya Patel", title: "Strategy Session Giveaway", description: "Win a free 1-hour business strategy session.", prize: "1-hour consultation ($500 value)", endsAt: "2026-07-01", entries: 89, active: true },
];

const MOCK_REFERRALS: ReferralRecord[] = [
  { id: "r1", referredName: "Sarah J.", date: "2026-04-22", status: "active", earned: 1.00 },
  { id: "r2", referredName: "Mike B.", date: "2026-04-25", status: "pending", earned: 0 },
];

const DEFAULT_USER: User = {
  id: "user",
  name: "Ken Uetrecht",
  email: "ken@urapp.com",
  photo: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663606080544/OOPiWWXfrMzrVXzQ.png",
  bio: "Founder of UR. I came from nothing and wanted to be better in life. I live with severe anxiety and bipolar disorder, and I know the limitations they bring — but I also know that with hard work and determination, you can overcome them. That's why I created UR. Help me build it into one of the biggest apps out there.",
  isCreator: false,
  isAdmin: true,
  tier: "Silver",
  points: 245,
  balance: 35.02,
  ageVerified: true,
  joinedDate: "2026-04-15",
  trialEndsAt: "2026-05-22",
  referralCode: "KEN2026",
  earnings: 0,
  loyaltyPoints: 150,
  stickers: [],
  lastStarterPackDate: "2026-05-01",
};

const DEFAULT_PARTNERS: Partner[] = [
  { id: "p_rms", name: "Real Merchant Services", tagline: "Better merchant tools for creators", category: "Financial", url: "", payoutNote: "% of monthly fee (recurring)", slots: ["founder_card", "wallet_tools", "onboarding"], enabled: false, clicks: 0 },
  { id: "p_impact", name: "Impact", tagline: "Hundreds of brands, one signup", category: "Network", url: "", payoutNote: "Varies by brand", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_shareasale", name: "ShareASale", tagline: "Affiliate network giant", category: "Network", url: "", payoutNote: "Varies by brand", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_amazon", name: "Amazon Associates", tagline: "Recommend anything on Amazon", category: "Retail", url: "", payoutNote: "1–10% per sale", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_chime", name: "Chime", tagline: "Mobile banking built for everyday people", category: "Financial", url: "", payoutNote: "$5–$30 per funded signup", slots: ["wallet_tools", "onboarding"], enabled: false, clicks: 0 },
  { id: "p_cashapp", name: "Cash App", tagline: "Send, spend, save", category: "Financial", url: "", payoutNote: "$5–$10 per signup", slots: ["wallet_tools"], enabled: false, clicks: 0 },
  { id: "p_canva", name: "Canva Pro", tagline: "Design tools every creator needs", category: "Creator Tools", url: "", payoutNote: "≈ $36 per Pro signup", slots: ["profile_partners", "founder_card"], enabled: false, clicks: 0 },
  { id: "p_capcut", name: "CapCut Pro", tagline: "Pro video editing on your phone", category: "Creator Tools", url: "", payoutNote: "15–40% recurring", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_beacons", name: "Beacons", tagline: "All-in-one creator landing pages", category: "Creator Tools", url: "", payoutNote: "30% recurring", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_convertkit", name: "ConvertKit", tagline: "Email lists for creators", category: "Creator Tools", url: "", payoutNote: "30% recurring", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_skillshare", name: "Skillshare", tagline: "Learn anything, on your time", category: "Education", url: "", payoutNote: "$7–$10 per signup", slots: ["discover_banner"], enabled: false, clicks: 0 },
  { id: "p_masterclass", name: "MasterClass", tagline: "Learn from the best in the world", category: "Education", url: "", payoutNote: "25% per sale", slots: ["discover_banner"], enabled: false, clicks: 0 },
  { id: "p_mintmobile", name: "Mint Mobile", tagline: "Premium phone plans, way less money", category: "Phone", url: "", payoutNote: "$10–$30 per signup", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_nordvpn", name: "NordVPN", tagline: "Privacy and security online", category: "Tools", url: "", payoutNote: "40% per sale", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_hostinger", name: "Hostinger", tagline: "Affordable hosting for your website", category: "Web", url: "", payoutNote: "$60+ per signup", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_audible", name: "Audible", tagline: "Stories that move you", category: "Education", url: "", payoutNote: "≈ $15 per trial", slots: ["discover_banner"], enabled: false, clicks: 0 },
  { id: "p_fiverr", name: "Fiverr", tagline: "Hire freelancers fast", category: "Creator Tools", url: "", payoutNote: "$15–$150 per FTB", slots: ["profile_partners"], enabled: false, clicks: 0 },
  { id: "p_printful", name: "Printful", tagline: "Sell custom merch with no inventory", category: "Creator Tools", url: "", payoutNote: "10% recurring (24 mo)", slots: ["profile_partners"], enabled: false, clicks: 0 },
];

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  contestsEnabled: true,  // Built but can be toggled off later for phased launch
  giveawaysEnabled: true,
  videoUploadsEnabled: false,
  cryptoEnabled: false,
  collaborationEnabled: false,
  schedulingEnabled: false,
};

// ==================== STORAGE KEYS ====================

const KEYS = {
  USER: "ur:user",
  ONBOARDED: "ur:onboarded",
  CREATORS: "ur:creators",
  CONVERSATIONS: "ur:conversations",
  MESSAGES: "ur:messages",
  TRANSACTIONS: "ur:transactions",
  FOLLOWING: "ur:following",
  CONTESTS: "ur:contests",
  GIVEAWAYS: "ur:giveaways",
  REFERRALS: "ur:referrals",
  LEADS: "ur:leads",
  REPORTS: "ur:reports",
  FEATURE_FLAGS: "ur:flags",
  PARTNERS: "ur:partners",
  EMAIL_SETTINGS: "ur:email_settings",
};

// ==================== EMAIL SETTINGS ====================

export type EmailSettings = {
  urEmail: string;
  personalCcEmail: string;
  autoEmailLeads: boolean;
};

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  urEmail: "ken.uetrecht.ur@gmail.com",
  personalCcEmail: "",
  autoEmailLeads: false,
};

export async function getEmailSettings(): Promise<EmailSettings> {
  return loadJSON<EmailSettings>(KEYS.EMAIL_SETTINGS, DEFAULT_EMAIL_SETTINGS);
}

export async function saveEmailSettings(patch: Partial<EmailSettings>): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const next = { ...current, ...patch };
  await saveJSON(KEYS.EMAIL_SETTINGS, next);
  return next;
}

// Format a single lead as plain text suitable for email body / clipboard
export function formatSingleLead(lead: Lead): string {
  const lines = [
    `UR — New Affiliate Lead`,
    `────────────────────────`,
    `Service:       ${lead.service}`,
    `Owner Name:    ${lead.name}`,
    lead.businessName ? `Business Name: ${lead.businessName}` : null,
    lead.phone ? `Phone:         ${lead.phone}` : null,
    `Email:         ${lead.email}`,
    `Submitted:     ${lead.date}`,
    `Status:        ${lead.status}${lead.forwarded ? " (forwarded)" : ""}`,
  ].filter(Boolean);
  return lines.join("\n");
}

// Format many leads for export / share
export function formatLeadsForExport(leads: Lead[]): string {
  if (leads.length === 0) return "No leads to export.";
  const header = `UR Lead Export — ${new Date().toLocaleString()}\nTotal: ${leads.length} lead${leads.length === 1 ? "" : "s"}\n`;
  return header + "\n\n" + leads.map(formatSingleLead).join("\n\n");
}

// ==================== STORAGE HELPERS ====================

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// ==================== PUBLIC API ====================

export async function getUser(): Promise<User> {
  return loadJSON(KEYS.USER, DEFAULT_USER);
}

export async function saveUser(user: User): Promise<void> {
  return saveJSON(KEYS.USER, user);
}

export async function isOnboarded(): Promise<boolean> {
  return loadJSON(KEYS.ONBOARDED, false);
}

export async function setOnboarded(value: boolean): Promise<void> {
  return saveJSON(KEYS.ONBOARDED, value);
}

export async function getCreators(): Promise<Creator[]> {
  return loadJSON(KEYS.CREATORS, MOCK_CREATORS);
}

export async function getCreator(id: string): Promise<Creator | undefined> {
  const creators = await getCreators();
  return creators.find((c) => c.id === id);
}

export async function getConversations(): Promise<Conversation[]> {
  return loadJSON(KEYS.CONVERSATIONS, MOCK_CONVERSATIONS);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const all = await loadJSON<Record<string, Message[]>>(KEYS.MESSAGES, MOCK_MESSAGES);
  return all[conversationId] || [];
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  const all = await loadJSON<Record<string, Message[]>>(KEYS.MESSAGES, MOCK_MESSAGES);
  const newMsg: Message = {
    id: `m${Date.now()}`,
    conversationId,
    senderId: "user",
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    isOwn: true,
  };
  all[conversationId] = [...(all[conversationId] || []), newMsg];
  await saveJSON(KEYS.MESSAGES, all);
  return newMsg;
}

export async function getTransactions(): Promise<Transaction[]> {
  return loadJSON(KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
}

export async function addTransaction(tx: Omit<Transaction, "id" | "date" | "status">): Promise<Transaction> {
  const transactions = await getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: `t${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    status: "completed",
  };
  await saveJSON(KEYS.TRANSACTIONS, [newTx, ...transactions]);
  // Update user balance
  const user = await getUser();
  await saveUser({ ...user, balance: user.balance + tx.amount });
  return newTx;
}

export async function getFollowing(): Promise<string[]> {
  return loadJSON(KEYS.FOLLOWING, ["c1", "c2", "c4", "c7"]);
}

export async function toggleFollow(creatorId: string): Promise<boolean> {
  const following = await getFollowing();
  const isFollowing = following.includes(creatorId);
  const updated = isFollowing ? following.filter((id) => id !== creatorId) : [...following, creatorId];
  await saveJSON(KEYS.FOLLOWING, updated);
  return !isFollowing;
}

export async function isFollowing(creatorId: string): Promise<boolean> {
  const following = await getFollowing();
  return following.includes(creatorId);
}

/**
 * Founder tip flow.
 * - Validates user has sufficient balance
 * - Deducts tip from user wallet (negative transaction)
 * - Increments founder earnings
 * - Returns the result for UI feedback
 */
export async function tipFounder(amount: number): Promise<{ ok: true } | { ok: false; reason: "insufficient_balance" }> {
  if (!(amount > 0)) return { ok: false, reason: "insufficient_balance" };
  const user = await getUser();
  if (user.balance < amount) return { ok: false, reason: "insufficient_balance" };

  await addTransaction({
    type: "tip",
    amount: -amount,
    description: `Founder tip — Ken Uetrecht`,
    creatorId: "founder",
    creatorName: "Ken Uetrecht",
  });

  // Bump founder's earnings (admin's own balance is already adjusted by addTransaction;
  // earnings is the lifetime tally for the admin dashboard).
  const refreshed = await getUser();
  await saveUser({ ...refreshed, earnings: (refreshed.earnings || 0) + amount });
  return { ok: true };
}

export async function addPoints(amount: number): Promise<User> {
  const user = await getUser();
  const newPoints = user.points + amount;
  const newTier = calculateTier(newPoints);
  const updated = { ...user, points: newPoints, tier: newTier };
  await saveUser(updated);
  return updated;
}

export async function getContests(): Promise<Contest[]> {
  return loadJSON(KEYS.CONTESTS, MOCK_CONTESTS);
}

export async function getGiveaways(): Promise<Giveaway[]> {
  return loadJSON(KEYS.GIVEAWAYS, MOCK_GIVEAWAYS);
}

export async function getReferrals(): Promise<ReferralRecord[]> {
  return loadJSON(KEYS.REFERRALS, MOCK_REFERRALS);
}

export async function getLeads(): Promise<Lead[]> {
  return loadJSON(KEYS.LEADS, []);
}

export async function addLead(
  service: string,
  name: string,
  email: string,
  businessName: string = "",
  phone: string = "",
): Promise<Lead> {
  const leads = await getLeads();
  const newLead: Lead = {
    id: `l${Date.now()}`,
    service,
    name,
    businessName,
    phone,
    email,
    date: new Date().toISOString().split("T")[0],
    status: "submitted",
    forwarded: false,
  };
  await saveJSON(KEYS.LEADS, [newLead, ...leads]);
  return newLead;
}

export async function markLeadForwarded(id: string, forwarded: boolean = true): Promise<void> {
  const leads = await getLeads();
  const next = leads.map((l) => (l.id === id ? { ...l, forwarded } : l));
  await saveJSON(KEYS.LEADS, next);
}

export async function markAllLeadsForwarded(): Promise<void> {
  const leads = await getLeads();
  const next = leads.map((l) => ({ ...l, forwarded: true }));
  await saveJSON(KEYS.LEADS, next);
}

export async function getReports(): Promise<Report[]> {
  return loadJSON(KEYS.REPORTS, []);
}

export async function addReport(reportedUserId: string, reportedUserName: string, reason: string, description: string): Promise<Report> {
  const reports = await getReports();
  const newReport: Report = {
    id: `rp${Date.now()}`,
    reporterId: "user",
    reportedUserId,
    reportedUserName,
    reason,
    description,
    date: new Date().toISOString().split("T")[0],
    status: "pending",
  };
  await saveJSON(KEYS.REPORTS, [newReport, ...reports]);
  return newReport;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return loadJSON(KEYS.FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS);
}

export async function updateFeatureFlags(flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
  const current = await getFeatureFlags();
  const updated = { ...current, ...flags };
  await saveJSON(KEYS.FEATURE_FLAGS, updated);
  return updated;
}

// ==================== PARTNERS (AFFILIATE) SYSTEM ====================

export async function getPartners(): Promise<Partner[]> {
  return loadJSON(KEYS.PARTNERS, DEFAULT_PARTNERS);
}

export async function savePartner(partner: Partner): Promise<Partner[]> {
  const all = await getPartners();
  const next = all.map((p) => (p.id === partner.id ? partner : p));
  await saveJSON(KEYS.PARTNERS, next);
  return next;
}

export async function togglePartner(id: string): Promise<Partner[]> {
  const all = await getPartners();
  const next = all.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
  await saveJSON(KEYS.PARTNERS, next);
  return next;
}

/**
 * Pick a partner to render in a given slot.
 * Only enabled partners with a non-empty url qualify.
 * Rotation is deterministic per (slot, day) so a single user sees the same
 * partner all day in a slot but different ones day to day.
 */
export async function pickPartnerForSlot(
  slot: PartnerSlot,
  seed: number = Math.floor(Date.now() / (1000 * 60 * 60 * 24)),
): Promise<Partner | null> {
  const all = await getPartners();
  const eligible = all.filter((p) => p.enabled && p.url.trim().length > 0 && p.slots.includes(slot));
  if (eligible.length === 0) return null;
  const idx = ((seed % eligible.length) + eligible.length) % eligible.length;
  return eligible[idx];
}

export async function recordPartnerClick(id: string): Promise<void> {
  const all = await getPartners();
  const next = all.map((p) => (p.id === id ? { ...p, clicks: p.clicks + 1 } : p));
  await saveJSON(KEYS.PARTNERS, next);
}

// ==================== ADMIN STATS ====================

export async function getPlatformStats() {
  const creators = await getCreators();
  const transactions = await getTransactions();
  const leads = await getLeads();

  const totalRevenue = creators.reduce((sum, c) => sum + c.members * c.monthlyPrice * 0.15, 0);
  const totalUsers = 1247; // Simulated platform-wide stat
  const totalCreators = creators.length;
  const transactionVolume = creators.reduce((sum, c) => sum + c.members * c.monthlyPrice, 0);

  return {
    totalRevenue,
    totalUsers,
    totalCreators,
    transactionVolume,
    leadsCount: leads.length,
    transactionsCount: transactions.length,
  };
}
