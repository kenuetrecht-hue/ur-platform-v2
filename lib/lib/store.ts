export interface Creator {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
}

export interface Partner {
  id: string;
  name: string;
}

export const TIERS = [];
export const getCreators = async () => [];
export const getUser = async () => null;
export const pointsToNextTier = () => 0;
export const tipFounder = async () => {};
export const pickPartnerForSlot = () => null;
export const recordPartnerClick = () => {};
