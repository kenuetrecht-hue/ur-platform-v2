import { z } from "zod";

/**
 * Zillow/MLS Property Data API Integration
 * Provides live property data, market comps, and ARV estimates
 */

export const PropertyDataSchema = z.object({
  zpid: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  price: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  sqft: z.number(),
  yearBuilt: z.number(),
  daysOnZillow: z.number(),
  priceHistory: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
  taxHistory: z.array(z.object({
    year: z.number(),
    taxAmount: z.number(),
  })),
  estimatedValue: z.number(),
  zestimate: z.number(),
  rentEstimate: z.number(),
});

export type PropertyData = z.infer<typeof PropertyDataSchema>;

export interface PropertySearchRequest {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
}

export interface ComparableSalesRequest {
  zpid: string;
  radius?: number; // in miles
  count?: number; // number of comps to return
}

export interface ARVEstimateRequest {
  zpid: string;
  afterRepairCondition?: "good" | "excellent" | "like-new";
}

export interface ARVEstimateResponse {
  currentValue: number;
  estimatedARV: number;
  repairCosts: number;
  profitPotential: number;
  roi: number;
}

/**
 * Zillow/MLS Property Data Service
 */
export class ZillowMLSService {
  private apiKey: string;
  private baseUrl = "https://api.zillow.com/v2";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Zillow API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Search for properties by address
   */
  async searchProperty(request: PropertySearchRequest): Promise<PropertyData> {
    try {
      const query = new URLSearchParams({
        address: request.address,
        citystatezip: `${request.city}, ${request.state} ${request.zipCode || ""}`,
        zws_id: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/GetSearchResults.htm?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zillow API error: ${response.statusText}`);
      }

      const data = await response.json();
      return PropertyDataSchema.parse(data.response.results[0]);
    } catch (error) {
      console.error("Property search error:", error);
      throw error;
    }
  }

  /**
   * Get comparable sales (market comps)
   */
  async getComparableSales(request: ComparableSalesRequest): Promise<PropertyData[]> {
    try {
      const query = new URLSearchParams({
        zpid: request.zpid,
        count: String(request.count || 5),
        zws_id: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/GetComps.htm?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zillow API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response.properties.map((prop: any) =>
        PropertyDataSchema.parse(prop)
      );
    } catch (error) {
      console.error("Comparable sales error:", error);
      throw error;
    }
  }

  /**
   * Get property details
   */
  async getPropertyDetails(zpid: string): Promise<PropertyData> {
    try {
      const query = new URLSearchParams({
        zpid,
        zws_id: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/GetProperty.htm?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zillow API error: ${response.statusText}`);
      }

      const data = await response.json();
      return PropertyDataSchema.parse(data.response.property);
    } catch (error) {
      console.error("Property details error:", error);
      throw error;
    }
  }

  /**
   * Calculate ARV (After Repair Value) estimate
   */
  async estimateARV(request: ARVEstimateRequest): Promise<ARVEstimateResponse> {
    try {
      const property = await this.getPropertyDetails(request.zpid);
      const comps = await this.getComparableSales({
        zpid: request.zpid,
        count: 5,
      });

      // Calculate average comp price per sqft
      const avgPricePerSqft =
        comps.reduce((sum, comp) => sum + comp.price / comp.sqft, 0) / comps.length;

      // Estimate ARV based on condition
      const conditionMultiplier =
        request.afterRepairCondition === "excellent"
          ? 1.15
          : request.afterRepairCondition === "like-new"
          ? 1.25
          : 1.0;

      const estimatedARV = property.sqft * avgPricePerSqft * conditionMultiplier;

      // Estimate repair costs (typically 10-30% of property value)
      const repairCosts = property.price * 0.2; // 20% average

      const profitPotential = estimatedARV - property.price - repairCosts;
      const roi = (profitPotential / property.price) * 100;

      return {
        currentValue: property.price,
        estimatedARV: Math.round(estimatedARV),
        repairCosts: Math.round(repairCosts),
        profitPotential: Math.round(profitPotential),
        roi: Math.round(roi * 100) / 100,
      };
    } catch (error) {
      console.error("ARV estimation error:", error);
      throw error;
    }
  }

  /**
   * Get market trends by city
   */
  async getMarketTrends(city: string, state: string): Promise<any> {
    try {
      const query = new URLSearchParams({
        city,
        state,
        zws_id: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/GetDemographics.htm?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zillow API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Market trends error:", error);
      throw error;
    }
  }

  /**
   * Calculate MAO (Maximum Allowable Offer)
   */
  calculateMAO(
    arvEstimate: number,
    desiredProfitMargin: number = 0.2, // 20% default
    repairCosts: number = 0
  ): number {
    // MAO = ARV * (1 - Profit Margin) - Repair Costs - Holding Costs
    const holdingCosts = arvEstimate * 0.05; // 5% for holding costs
    const mao = arvEstimate * (1 - desiredProfitMargin) - repairCosts - holdingCosts;
    return Math.round(mao);
  }
}

/**
 * Initialize Zillow service with environment variables
 */
export function initializeZillowService(): ZillowMLSService {
  const apiKey = process.env.ZILLOW_API_KEY;
  if (!apiKey) {
    throw new Error("ZILLOW_API_KEY environment variable is not set");
  }
  return new ZillowMLSService(apiKey);
}
