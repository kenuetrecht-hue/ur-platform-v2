export interface URUser {
  id: string;
  email: string;
  username: string;
  photo: string;
  bio: string;
  points: number;
  tier: string;
  joinedDate: string;
}

export interface Creator {
  id: string;
  name: string;
  username: string;
  photo: string;
  bio: string;
  verified: boolean;
  members: number;
  tier: string;
  minutePrice?: number;
  monthlyPrice: number;
  joinedDate: string;
}

export interface CreatorContent {
  id: string;
  creatorId: string;
  type: "image" | "video" | "text";
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface AIAgent {
  id: string;
  name: string;
  category: string;
  avatar: string;
  description: string;
  price: number;
  followers: number;
  rating: number;
}

export interface AISession {
  id: string;
  agentId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  messages: AIChatMessage[];
}

export interface AIChatMessage {
  id: string;
  sessionId: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
}

export interface ThreeDAsset {
  id: string;
  name: string;
  type: "model" | "texture" | "material";
  url: string;
  thumbnail?: string;
  description?: string;
  creatorId: string;
  price: number;
}

export interface ThreeDProject {
  id: string;
  name: string;
  userId: string;
  assets: ThreeDAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AI3DModel {
  id: string;
  name: string;
  avatar: string;
  uniform: string;
  tools: string[];
  workspace: string;
  description: string;
  category: string;
  price: number;
  followers: number;
  rating: number;
}

export interface Workspace3D {
  id: string;
  name: string;
  background: string;
  lighting: string;
  objects: string[];
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
  description: string;
}
