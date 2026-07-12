import { z } from "zod";

/**
 * Property Data Service
 * Integrates with Zillow/MLS APIs for live market data and ARV estimation
 * Currently uses mock data; ready for real API integration
 */

export const PropertyDataSchema = z.object({
  id: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  lat: z.number(),
  lng: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number(),
  yearBuilt: z.number(),
  lastSalePrice: z.number(),
  lastSaleDate: z.string(),
  estimatedValue: z.number(),
  zestimate: z.number(),
  pricePerSqFt: z.number(),
  daysOnMarket: z.number(),
  propertyType: z.enum(["house", "condo", "townhouse", "multi-family"]),
  taxAssessedValue: z.number(),
  annualPropertyTax: z.number(),
  lotSize: z.number(),
});

export type PropertyData = z.infer<typeof PropertyDataSchema>;

export const ARVEstimateSchema = z.object({
  propertyId: z.string(),
  currentCondition: z.enum(["poor", "fair", "good", "excellent"]),
  estimatedRepairCost: z.number(),
  marketComps: z.array(
    z.object({
      address: z.string(),
      salePrice: z.number(),
      saleDate: z.string(),
      similarity: z.number(), // 0-100 percentage
    })
  ),
  arvEstimate: z.number(),
  confidence: z.number(), // 0-100 percentage
  marketTrend: z.enum(["declining", "stable", "appreciating"]),
  projectedAppreciation: z.number(), // annual percentage
});

export type ARVEstimate = z.infer<typeof ARVEstimateSchema>;

// Mock property database (replace with real API calls)
const MOCK_PROPERTIES: PropertyData[] = [
  {
    id: "prop_001",
    address: "123 Oak Street",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    lat: 30.2672,
    lng: -97.7431,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1850,
    yearBuilt: 1995,
    lastSalePrice: 320000,
    lastSaleDate: "2023-06-15",
    estimatedValue: 380000,
    zestimate: 385000,
    pricePerSqFt: 205,
    daysOnMarket: 0,
    propertyType: "house",
    taxAssessedValue: 350000,
    annualPropertyTax: 4200,
    lotSize: 0.25,
  },
  {
    id: "prop_002",
    address: "456 Maple Avenue",
    city: "Dallas",
    state: "TX",
    zipCode: "75201",
    lat: 32.7767,
    lng: -96.797,
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2200,
    yearBuilt: 2005,
    lastSalePrice: 280000,
    lastSaleDate: "2023-08-20",
    estimatedValue: 320000,
    zestimate: 315000,
    pricePerSqFt: 145,
    daysOnMarket: 0,
    propertyType: "house",
    taxAssessedValue: 300000,
    annualPropertyTax: 3600,
    lotSize: 0.3,
  },
  {
    id: "prop_003",
    address: "789 Pine Road",
    city: "Houston",
    state: "TX",
    zipCode: "77001",
    lat: 29.7604,
    lng: -95.3698,
    bedrooms: 5,
    bathrooms: 3,
    squareFeet: 2800,
    yearBuilt: 2000,
    lastSalePrice: 420000,
    lastSaleDate: "2023-05-10",
    estimatedValue: 520000,
    zestimate: 525000,
    pricePerSqFt: 186,
    daysOnMarket: 0,
    propertyType: "house",
    taxAssessedValue: 480000,
    annualPropertyTax: 5760,
    lotSize: 0.4,
  },
];

// Mock market comps database
const MOCK_COMPS = {
  prop_001: [
    { address: "120 Oak Street", salePrice: 375000, saleDate: "2024-01-10", similarity: 95 },
    { address: "125 Oak Street", salePrice: 385000, saleDate: "2024-02-05", similarity: 92 },
    { address: "130 Oak Street", salePrice: 380000, saleDate: "2024-01-28", similarity: 90 },
  ],
  prop_002: [
    { address: "450 Maple Avenue", salePrice: 315000, saleDate: "2024-01-15", similarity: 94 },
    { address: "460 Maple Avenue", salePrice: 320000, saleDate: "2024-02-01", similarity: 91 },
    { address: "470 Maple Avenue", salePrice: 318000, saleDate: "2024-01-20", similarity: 89 },
  ],
  prop_003: [
    { address: "785 Pine Road", salePrice: 515000, saleDate: "2024-01-12", similarity: 96 },
    { address: "795 Pine Road", salePrice: 525000, saleDate: "2024-02-03", similarity: 93 },
    { address: "800 Pine Road", salePrice: 520000, saleDate: "2024-01-25", similarity: 91 },
  ],
};

/**
 * Search properties by address
 * TODO: Replace with real Zillow/MLS API call
 */
export async function searchPropertyByAddress(address: string): Promise<PropertyData | null> {
  // Mock implementation - search in mock database
  const property = MOCK_PROPERTIES.find(
    (p) =>
      p.address.toLowerCase().includes(address.toLowerCase()) ||
      `${p.address}, ${p.city}, ${p.state}`.toLowerCase().includes(address.toLowerCase())
  );

  if (!property) {
    return null;
  }

  return property;
}

/**
 * Get property details by ID
 * TODO: Replace with real Zillow/MLS API call
 */
export async function getPropertyDetails(propertyId: string): Promise<PropertyData | null> {
  return MOCK_PROPERTIES.find((p) => p.id === propertyId) || null;
}

/**
 * Estimate ARV (After Repair Value) for a property
 * Uses market comps and repair cost estimation
 */
export async function estimateARV(
  propertyId: string,
  currentCondition: "poor" | "fair" | "good" | "excellent",
  estimatedRepairCost: number
): Promise<ARVEstimate> {
  const property = await getPropertyDetails(propertyId);

  if (!property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  // Get market comps
  const comps = MOCK_COMPS[propertyId as keyof typeof MOCK_COMPS] || [];

  // Calculate average comp price
  const avgCompPrice =
    comps.length > 0 ? comps.reduce((sum, c) => sum + c.salePrice, 0) / comps.length : property.estimatedValue;

  // Adjust for condition
  const conditionMultiplier = {
    poor: 0.7,
    fair: 0.85,
    good: 0.95,
    excellent: 1.0,
  };

  const adjustedValue = avgCompPrice * conditionMultiplier[currentCondition];
  const arvEstimate = adjustedValue + estimatedRepairCost;

  // Determine market trend
  const recentComps = comps.slice(0, 3);
  const avgRecentPrice = recentComps.reduce((sum, c) => sum + c.salePrice, 0) / recentComps.length;
  const marketTrend =
    avgRecentPrice > avgCompPrice
      ? ("appreciating" as const)
      : avgRecentPrice < avgCompPrice
        ? ("declining" as const)
        : ("stable" as const);

  // Calculate projected appreciation (annual)
  const projectedAppreciation = marketTrend === "appreciating" ? 0.03 : marketTrend === "declining" ? -0.02 : 0.01;

  // Confidence based on number of comps and similarity
  const avgSimilarity = comps.length > 0 ? comps.reduce((sum, c) => sum + c.similarity, 0) / comps.length : 70;
  const confidence = Math.min(100, avgSimilarity + (comps.length > 2 ? 10 : 0));

  return {
    propertyId,
    currentCondition,
    estimatedRepairCost,
    marketComps: comps,
    arvEstimate: Math.round(arvEstimate),
    confidence: Math.round(confidence),
    marketTrend,
    projectedAppreciation,
  };
}

/**
 * Get market trends for a city
 * TODO: Replace with real market data API
 */
export async function getMarketTrends(city: string, state: string) {
  // Mock market data
  const marketData = {
    avgPricePerSqFt: 185,
    medianHomePrice: 425000,
    priceAppreciation: 3.2, // annual percentage
    daysOnMarket: 28,
    inventoryLevel: "moderate",
    marketCondition: "seller's market",
  };

  return marketData;
}

/**
 * Get comparable sales for a property
 */
export async function getComparableSales(propertyId: string) {
  return MOCK_COMPS[propertyId as keyof typeof MOCK_COMPS] || [];
}

/**
 * Calculate investment metrics
 */
export function calculateInvestmentMetrics(
  purchasePrice: number,
  repairCost: number,
  arvEstimate: number,
  closingCosts: number = 0.06
) {
  const totalInvestment = purchasePrice + repairCost;
  const closingCostAmount = arvEstimate * closingCosts;
  const grossProfit = arvEstimate - totalInvestment;
  const netProfit = grossProfit - closingCostAmount;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const profitMargin = arvEstimate > 0 ? (netProfit / arvEstimate) * 100 : 0;

  return {
    totalInvestment,
    grossProfit,
    closingCostAmount,
    netProfit,
    roi: parseFloat(roi.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
  };
}
