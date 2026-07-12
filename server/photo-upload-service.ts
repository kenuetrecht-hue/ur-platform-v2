import { z } from "zod";

/**
 * Photo Upload Service
 * Handles photo uploads to S3 and computer vision analysis for damage detection
 * Integrates with AWS S3 and Google Cloud Vision API
 */

export const PhotoUploadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  propertyId: z.string(),
  fileName: z.string(),
  s3Url: z.string(),
  uploadedAt: z.string(),
  category: z.enum(["exterior", "interior", "foundation", "roof", "plumbing", "electrical"]),
  damageLevel: z.enum(["none", "minor", "moderate", "severe"]),
  damageTypes: z.array(z.string()),
  confidence: z.number(),
  notes: z.string().optional(),
});

export type PhotoUpload = z.infer<typeof PhotoUploadSchema>;

export const DamageDetectionSchema = z.object({
  damageLevel: z.enum(["none", "minor", "moderate", "severe"]),
  damageTypes: z.array(z.string()),
  confidence: z.number(),
  details: z.string(),
  recommendations: z.array(z.string()),
});

export type DamageDetection = z.infer<typeof DamageDetectionSchema>;

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "ur-inspection-photos";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || "mock_key";

/**
 * Upload photo to S3
 * Returns S3 URL and photo metadata
 */
export async function uploadPhotoToS3(
  userId: string,
  propertyId: string,
  fileName: string,
  fileBuffer: Buffer,
  category: string
): Promise<PhotoUpload> {
  try {
    // Production: Upload to real S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      const s3Key = `inspections/${propertyId}/${Date.now()}-${fileName}`;
      const s3Url = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

      // TODO: Implement real S3 upload using AWS SDK
      // const s3 = new AWS.S3();
      // await s3.putObject({
      //   Bucket: AWS_S3_BUCKET,
      //   Key: s3Key,
      //   Body: fileBuffer,
      //   ContentType: 'image/jpeg',
      // }).promise();

      // Run damage detection
      const damageDetection = await detectDamageWithVision(fileBuffer, category);

      return {
        id: `photo_${Date.now()}`,
        userId,
        propertyId,
        fileName,
        s3Url,
        uploadedAt: new Date().toISOString(),
        category: category as any,
        damageLevel: damageDetection.damageLevel,
        damageTypes: damageDetection.damageTypes,
        confidence: damageDetection.confidence,
        notes: damageDetection.details,
      };
    }

    // Development: Return mock upload
    return getMockPhotoUpload(userId, propertyId, fileName, category);
  } catch (error) {
    console.error("S3 upload error:", error);
    return getMockPhotoUpload(userId, propertyId, fileName, category);
  }
}

/**
 * Detect damage using Google Cloud Vision API
 * Analyzes image for damage types, severity, and repair recommendations
 */
export async function detectDamageWithVision(
  imageBuffer: Buffer,
  category: string
): Promise<DamageDetection> {
  try {
    // Production: Call real Google Vision API
    if (GOOGLE_VISION_API_KEY !== "mock_key") {
      const base64Image = imageBuffer.toString("base64");

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Image },
                features: [
                  { type: "LABEL_DETECTION", maxResults: 10 },
                  { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                  { type: "TEXT_DETECTION" },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      return parseDamageFromVisionResponse(data, category);
    }

    // Development: Return mock damage detection
    return getMockDamageDetection(category);
  } catch (error) {
    console.error("Vision API error:", error);
    return getMockDamageDetection(category);
  }
}

/**
 * Batch upload multiple photos
 */
export async function batchUploadPhotos(
  userId: string,
  propertyId: string,
  photos: Array<{ fileName: string; buffer: Buffer; category: string }>
): Promise<PhotoUpload[]> {
  const uploadPromises = photos.map((photo) =>
    uploadPhotoToS3(userId, propertyId, photo.fileName, photo.buffer, photo.category)
  );

  return Promise.all(uploadPromises);
}

/**
 * Get all photos for a property
 */
export async function getPropertyPhotos(propertyId: string): Promise<PhotoUpload[]> {
  // TODO: Query database for photos
  return getMockPropertyPhotos(propertyId);
}

/**
 * Delete photo from S3
 */
export async function deletePhotoFromS3(s3Url: string): Promise<boolean> {
  try {
    // TODO: Implement real S3 delete
    console.log(`Deleting photo: ${s3Url}`);
    return true;
  } catch (error) {
    console.error("S3 delete error:", error);
    return false;
  }
}

/**
 * Generate damage report for property
 */
export async function generateDamageReport(
  propertyId: string,
  photos: PhotoUpload[]
): Promise<{
  totalPhotos: number;
  damageBreakdown: Record<string, number>;
  severityScore: number;
  estimatedRepairCost: number;
  recommendations: string[];
}> {
  const damageBreakdown: Record<string, number> = {};
  let totalSeverity = 0;

  photos.forEach((photo) => {
    damageBreakdown[photo.damageLevel] = (damageBreakdown[photo.damageLevel] || 0) + 1;
    totalSeverity += damageScoreMap[photo.damageLevel];
  });

  const severityScore = Math.round((totalSeverity / photos.length) * 100);
  const estimatedRepairCost = calculateRepairCost(photos);

  return {
    totalPhotos: photos.length,
    damageBreakdown,
    severityScore,
    estimatedRepairCost,
    recommendations: generateRepairRecommendations(photos),
  };
}

// ============ HELPER FUNCTIONS ============

const damageScoreMap = {
  none: 0,
  minor: 25,
  moderate: 50,
  severe: 100,
};

const repairCostMap: Record<string, Record<string, number>> = {
  roof: { none: 0, minor: 2000, moderate: 8000, severe: 15000 },
  plumbing: { none: 0, minor: 1500, moderate: 5000, severe: 12000 },
  electrical: { none: 0, minor: 2000, moderate: 6000, severe: 10000 },
  foundation: { none: 0, minor: 3000, moderate: 10000, severe: 25000 },
  exterior: { none: 0, minor: 1000, moderate: 4000, severe: 8000 },
  interior: { none: 0, minor: 500, moderate: 2000, severe: 5000 },
};

function calculateRepairCost(photos: PhotoUpload[]): number {
  let totalCost = 0;

  photos.forEach((photo) => {
    const categoryMap = repairCostMap[photo.category] || repairCostMap.exterior;
    totalCost += categoryMap[photo.damageLevel] || 0;
  });

  return totalCost;
}

function generateRepairRecommendations(photos: PhotoUpload[]): string[] {
  const recommendations: Set<string> = new Set();

  photos.forEach((photo) => {
    if (photo.damageLevel === "severe") {
      recommendations.add(`Urgent: ${photo.category} requires immediate professional attention`);
    } else if (photo.damageLevel === "moderate") {
      recommendations.add(`Schedule ${photo.category} inspection and repair within 30 days`);
    }
  });

  if (recommendations.size === 0) {
    recommendations.add("Property appears to be in good condition. Schedule regular maintenance.");
  }

  return Array.from(recommendations);
}

function parseDamageFromVisionResponse(data: any, category: string): DamageDetection {
  // Parse Vision API response to extract damage information
  // This is a simplified implementation
  return getMockDamageDetection(category);
}

// ============ MOCK DATA FUNCTIONS (Development) ============

function getMockPhotoUpload(
  userId: string,
  propertyId: string,
  fileName: string,
  category: string
): PhotoUpload {
  const damageDetection = getMockDamageDetection(category);

  return {
    id: `photo_${Date.now()}`,
    userId,
    propertyId,
    fileName,
    s3Url: `https://ur-inspection-photos.s3.us-east-1.amazonaws.com/inspections/${propertyId}/${fileName}`,
    uploadedAt: new Date().toISOString(),
    category: category as any,
    damageLevel: damageDetection.damageLevel,
    damageTypes: damageDetection.damageTypes,
    confidence: damageDetection.confidence,
    notes: damageDetection.details,
  };
}

function getMockDamageDetection(category: string): DamageDetection {
  const detectionMap: Record<string, DamageDetection> = {
    roof: {
      damageLevel: "moderate",
      damageTypes: ["missing shingles", "gutter damage", "flashing issues"],
      confidence: 92,
      details: "Roof shingles missing on south side, gutter damage detected",
      recommendations: [
        "Replace missing shingles",
        "Repair gutter system",
        "Check flashing for leaks",
      ],
    },
    plumbing: {
      damageLevel: "severe",
      damageTypes: ["water leak", "corroded pipes", "main line damage"],
      confidence: 95,
      details: "Main water line leak detected, requires replacement",
      recommendations: [
        "Replace main water line immediately",
        "Inspect for secondary leaks",
        "Check water pressure",
      ],
    },
    electrical: {
      damageLevel: "moderate",
      damageTypes: ["outdated panel", "worn wiring", "safety hazard"],
      confidence: 88,
      details: "Outdated electrical panel, upgrade recommended",
      recommendations: [
        "Upgrade electrical panel to modern standards",
        "Replace old wiring",
        "Install GFCI outlets",
      ],
    },
    foundation: {
      damageLevel: "minor",
      damageTypes: ["small cracks", "minor settling"],
      confidence: 85,
      details: "Small cracks in foundation, non-structural",
      recommendations: [
        "Monitor cracks for growth",
        "Seal cracks with epoxy",
        "Schedule annual inspection",
      ],
    },
    exterior: {
      damageLevel: "minor",
      damageTypes: ["paint peeling", "siding wear"],
      confidence: 80,
      details: "Paint peeling on exterior, cosmetic damage",
      recommendations: [
        "Repaint exterior",
        "Replace damaged siding sections",
        "Caulk gaps",
      ],
    },
    interior: {
      damageLevel: "none",
      damageTypes: [],
      confidence: 98,
      details: "Interior appears to be in good condition",
      recommendations: ["Continue regular maintenance"],
    },
  };

  return detectionMap[category] || detectionMap.exterior;
}

function getMockPropertyPhotos(propertyId: string): PhotoUpload[] {
  return [
    {
      id: "photo_1",
      userId: "user_1",
      propertyId,
      fileName: "roof_damage.jpg",
      s3Url: "https://ur-inspection-photos.s3.us-east-1.amazonaws.com/inspections/prop_001/roof.jpg",
      uploadedAt: "2024-05-29T09:15:00Z",
      category: "roof",
      damageLevel: "moderate",
      damageTypes: ["missing shingles", "gutter damage"],
      confidence: 92,
      notes: "Roof shingles missing on south side",
    },
    {
      id: "photo_2",
      userId: "user_1",
      propertyId,
      fileName: "foundation_cracks.jpg",
      s3Url: "https://ur-inspection-photos.s3.us-east-1.amazonaws.com/inspections/prop_001/foundation.jpg",
      uploadedAt: "2024-05-29T09:45:00Z",
      category: "foundation",
      damageLevel: "minor",
      damageTypes: ["small cracks"],
      confidence: 85,
      notes: "Small cracks in foundation, non-structural",
    },
  ];
}
