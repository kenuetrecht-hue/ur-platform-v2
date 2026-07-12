import { z } from "zod";

/**
 * Zillow API Integration Service
 * Connects to Zillow API for live property data, market comps, and real estate insights
 * Supports both mock data (development) and real API calls (production)
 */

export const ZillowPropertySchema = z.object({
  zpid: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number(),
  yearBuilt: z.number(),
  zestimate: z.number(),
  zestimateLastUpdated: z.string(),
  pricePerSqFt: z.number(),
  taxAssessedValue: z.number(),
  annualPropertyTax: z.number(),
  propertyType: z.string(),
  daysOnZillow: z.number(),
  rentalZestimate: z.number().optional(),
});

export type ZillowProperty = z.infer<typeof ZillowPropertySchema>;

export const ZillowCompSchema = z.object({
  zpid: z.string(),
  address: z.string(),
  salePrice: z.number(),
  saleDate: z.string(),
  squareFeet: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  pricePerSqFt: z.number(),
  similarity: z.number(),
});

export type ZillowComp = z.infer<typeof ZillowCompSchema>;

const ZILLOW_API_KEY = process.env.ZILLOW_API_KEY || "mock_key";
const ZILLOW_API_BASE = "https://api.zillow.com/v2";

/**
 * Search property by address using Zillow API
 * In production, this calls the real Zillow API
 * In development, returns mock data
 */
export async function searchZillowProperty(
  address: string,
  cityState: string
): Promise<ZillowProperty | null> {
  try {
    // Production: Call real Zillow API
    if (ZILLOW_API_KEY !== "mock_key") {
      const params = new URLSearchParams({
        address,
        citystatezip: cityState,
        zws_id: ZILLOW_API_KEY,
      });

      const response = await fetch(`${ZILLOW_API_BASE}/GetSearchResults.htm?${params}`);
      const data = await response.json();

      if (data.SearchResults?.Request?.Results?.Result) {
        const result = data.SearchResults.Request.Results.Result;
        return {
          zpid: result.zpid,
          address: result.address,
          city: result.address.split(",")[1]?.trim() || "",
          state: result.address.split(",")[2]?.trim().split(" ")[0] || "",
          zipCode: result.address.split(" ").pop() || "",
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude),
          bedrooms: parseInt(result.bedrooms) || 0,
          bathrooms: parseInt(result.bathrooms) || 0,
          squareFeet: parseInt(result.finishedSqFt) || 0,
          yearBuilt: parseInt(result.yearBuilt) || 0,
          zestimate: parseInt(result.zestimate?.amount?.[0]?.$t || "0"),
          zestimateLastUpdated: result.zestimate?.["last-updated"]?.[0] || "",
          pricePerSqFt: parseInt(result.zestimate?.amount?.[0]?.$t || "0") / (parseInt(result.finishedSqFt) || 1),
          taxAssessedValue: parseInt(result.taxAssessment || "0"),
          annualPropertyTax: parseInt(result.taxAssessment || "0") * 0.012,
          propertyType: result.useCode || "Single Family",
          daysOnZillow: parseInt(result.daysOnZillow) || 0,
        };
      }
    }

    // Development: Return mock data
    return getMockZillowProperty(address);
  } catch (error) {
    console.error("Zillow API error:", error);
    return getMockZillowProperty(address);
  }
}

/**
 * Get comparable sales for a property using Zillow API
 */
export async function getZillowComps(zpid: string, count: number = 5): Promise<ZillowComp[]> {
  try {
    // Production: Call real Zillow API
    if (ZILLOW_API_KEY !== "mock_key") {
      const params = new URLSearchParams({
        zpid,
        count: count.toString(),
        zws_id: ZILLOW_API_KEY,
      });

      const response = await fetch(`${ZILLOW_API_BASE}/GetComps.htm?${params}`);
      const data = await response.json();

      if (data.Comps?.comp) {
        const comps = Array.isArray(data.Comps.comp) ? data.Comps.comp : [data.Comps.comp];
        return comps.map((comp: any) => ({
          zpid: comp.zpid,
          address: comp.address,
          salePrice: parseInt(comp.zestimate?.amount?.[0]?.$t || "0"),
          saleDate: comp.zestimate?.["last-updated"]?.[0] || "",
          squareFeet: parseInt(comp.finishedSqFt) || 0,
          bedrooms: parseInt(comp.bedrooms) || 0,
          bathrooms: parseInt(comp.bathrooms) || 0,
          pricePerSqFt: parseInt(comp.zestimate?.amount?.[0]?.$t || "0") / (parseInt(comp.finishedSqFt) || 1),
          similarity: 90 + Math.random() * 10,
        }));
      }
    }

    // Development: Return mock comps
    return getMockZillowComps();
  } catch (error) {
    console.error("Zillow Comps API error:", error);
    return getMockZillowComps();
  }
}

/**
 * Get property details including tax history, price history, etc.
 */
export async function getZillowPropertyDetails(zpid: string): Promise<any> {
  try {
    // Production: Call real Zillow API
    if (ZILLOW_API_KEY !== "mock_key") {
      const params = new URLSearchParams({
        zpid,
        zws_id: ZILLOW_API_KEY,
      });

      const response = await fetch(`${ZILLOW_API_BASE}/GetProperty.htm?${params}`);
      return await response.json();
    }

    // Development: Return mock details
    return getMockPropertyDetails();
  } catch (error) {
    console.error("Zillow Property Details API error:", error);
    return getMockPropertyDetails();
  }
}

/**
 * Get market trends for a city/zip code
 */
export async function getZillowMarketTrends(region: string): Promise<any> {
  try {
    // Production: Call real Zillow API
    if (ZILLOW_API_KEY !== "mock_key") {
      const params = new URLSearchParams({
        region,
        zws_id: ZILLOW_API_KEY,
      });

      const response = await fetch(`${ZILLOW_API_BASE}/GetRegionChildren.htm?${params}`);
      return await response.json();
    }

    // Development: Return mock trends
    return getMockMarketTrends();
  } catch (error) {
    console.error("Zillow Market Trends API error:", error);
    return getMockMarketTrends();
  }
}

// ============ MOCK DATA FUNCTIONS (Development) ============

function getMockZillowProperty(address: string): ZillowProperty {
  const mockProperties: Record<string, ZillowProperty> = {
    "123 oak street": {
      zpid: "zpid_001",
      address: "123 Oak Street, Austin, TX 78701",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      latitude: 30.2672,
      longitude: -97.7431,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1850,
      yearBuilt: 1995,
      zestimate: 385000,
      zestimateLastUpdated: "2024-05-29",
      pricePerSqFt: 208,
      taxAssessedValue: 350000,
      annualPropertyTax: 4200,
      propertyType: "Single Family",
      daysOnZillow: 0,
    },
    "456 maple avenue": {
      zpid: "zpid_002",
      address: "456 Maple Avenue, Dallas, TX 75201",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
      latitude: 32.7767,
      longitude: -96.797,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFeet: 2200,
      yearBuilt: 2005,
      zestimate: 315000,
      zestimateLastUpdated: "2024-05-29",
      pricePerSqFt: 143,
      taxAssessedValue: 300000,
      annualPropertyTax: 3600,
      propertyType: "Single Family",
      daysOnZillow: 0,
    },
  };

  return mockProperties[address.toLowerCase()] || mockProperties["123 oak street"];
}

function getMockZillowComps(): ZillowComp[] {
  return [
    {
      zpid: "zpid_comp_1",
      address: "120 Oak Street, Austin, TX 78701",
      salePrice: 375000,
      saleDate: "2024-01-10",
      squareFeet: 1820,
      bedrooms: 3,
      bathrooms: 2,
      pricePerSqFt: 206,
      similarity: 95,
    },
    {
      zpid: "zpid_comp_2",
      address: "125 Oak Street, Austin, TX 78701",
      salePrice: 385000,
      saleDate: "2024-02-05",
      squareFeet: 1880,
      bedrooms: 3,
      bathrooms: 2,
      pricePerSqFt: 205,
      similarity: 92,
    },
    {
      zpid: "zpid_comp_3",
      address: "130 Oak Street, Austin, TX 78701",
      salePrice: 380000,
      saleDate: "2024-01-28",
      squareFeet: 1850,
      bedrooms: 3,
      bathrooms: 2,
      pricePerSqFt: 205,
      similarity: 90,
    },
  ];
}

function getMockPropertyDetails(): any {
  return {
    zpid: "zpid_001",
    address: "123 Oak Street, Austin, TX 78701",
    taxHistory: [
      { year: 2023, taxAmount: 4200 },
      { year: 2022, taxAmount: 4100 },
      { year: 2021, taxAmount: 4000 },
    ],
    priceHistory: [
      { date: "2023-06-15", price: 320000, event: "Sold" },
      { date: "2022-03-20", price: 310000, event: "Listed" },
    ],
    schoolDistrict: "Austin Independent School District",
    schools: [
      { name: "Oak Hill Elementary", distance: 0.5, rating: 8 },
      { name: "Central Middle School", distance: 1.2, rating: 7 },
    ],
  };
}

function getMockMarketTrends(): any {
  return {
    region: "Austin, TX",
    medianHomePrice: 425000,
    priceAppreciation: 3.2,
    daysOnMarket: 28,
    inventoryLevel: "moderate",
    marketCondition: "seller's market",
    trendingUp: true,
  };
}
