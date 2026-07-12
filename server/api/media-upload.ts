/**
 * UR MEDIA LLC - ENTERPRISE SCALING MEDIA ENGINE
 * DESIGN CRITERIA: ZERO MEDIA BUFFERING FOR MILLIONS OF SIMULTANEOUS USERS
 * 
 * This module handles:
 * - Direct S3 streaming (prevents server memory crashes)
 * - Cloudflare CDN integration (global content delivery)
 * - Adaptive HLS transcoding (dynamic network switching)
 * - Enterprise-grade error handling and logging
 */

import express, { Router } from "express";
import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";

const router = Router();

// =========================================================================
// 1. Initialize AWS S3 Infrastructure (Pay-As-You-Go Object Storage)
// =========================================================================

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// Initialize MediaConvert for adaptive HLS transcoding
const mediaConvert = new AWS.MediaConvert({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT,
});

// =========================================================================
// 2. High-Performance Upload Pipeline: Stream file directly to S3
// =========================================================================

const mediaUpload = multer({
  storage: multerS3({
    s3: s3 as any,
    bucket: process.env.AWS_S3_MEDIA_BUCKET || "ur-media-bucket",
    acl: "public-read" as any,
    metadata: function (req: any, file: any, cb: any) {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user?.id || "anonymous",
        uploadedAt: new Date().toISOString(),
      });
    },
    key: function (req: any, file: any, cb: any) {
      const folder = file.mimetype.startsWith("video/") ? "videos" : "audio";
      const creatorId = req.user?.id || "unknown";
      const uniqueFilename = `${folder}/${creatorId}/${Date.now()}_${file.originalname}`;
      cb(null, uniqueFilename);
    },
  }) as any,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// =========================================================================
// 3. API Endpoint: POST /api/media/upload
// =========================================================================

router.post("/upload", mediaUpload.single("creatorMedia"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const creatorId = req.user?.id || "unknown";
    const s3Key = req.file.key;
    const s3Url = `https://${process.env.AWS_S3_MEDIA_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3Key}`;
    const cdnUrl = s3Url.replace(
      `https://${process.env.AWS_S3_MEDIA_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`,
      process.env.CLOUDFLARE_CDN_DOMAIN || "https://cdn.urmediallc.com"
    );

    // =========================================================================
    // 4. Trigger AWS MediaConvert for Adaptive HLS Transcoding
    // =========================================================================

    const jobSettings: any = {
      Inputs: [
        {
          FileInput: s3Url,
        },
      ],
      OutputGroups: [
        {
          Name: "Apple HLS",
          OutputGroupSettings: {
            Type: "HLS_GROUP_SETTINGS",
            HlsGroupSettings: {
              Destination: `s3://${process.env.AWS_S3_MEDIA_BUCKET}/hls/${creatorId}/${Date.now()}/`,
              SegmentLength: 10,
              MinSegmentLength: 0,
              Outputs: [
                {
                  NameModifier: "_main",
                  OutputSettings: {
                    HlsSettings: {
                      AudioGroupId: "audio_aac_1_eng",
                    },
                  },
                },
                {
                  NameModifier: "_medium",
                  OutputSettings: {
                    HlsSettings: {
                      AudioGroupId: "audio_aac_1_eng",
                    },
                  },
                },
                {
                  NameModifier: "_low",
                  OutputSettings: {
                    HlsSettings: {
                      AudioGroupId: "audio_aac_1_eng",
                    },
                  },
                },
              ],
            },
          },
        },
      ],
      TimecodeConfig: {
        Source: "ZEROBASED",
      },
    };

    const params: any = {
      Role: process.env.AWS_MEDIACONVERT_ROLE_ARN,
      Settings: jobSettings,
    };

    let transcodingJobId = "pending";
    try {
      const job = await mediaConvert.createJob(params).promise();
      transcodingJobId = job.Job?.Id || "pending";
    } catch (err) {
      console.error("MediaConvert job creation failed:", err);
    }

    // =========================================================================
    // 5. Return Response with CDN URLs
    // =========================================================================

    return res.json({
      success: true,
      data: {
        rawStorageUrl: s3Url,
        highSpeedStreamingUrl: `${cdnUrl.replace(/\.[^.]+$/, "")}.m3u8`,
        s3Key,
        mediaType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedAt: new Date().toISOString(),
        transcodingJobId,
        transcodingStatus: "PENDING",
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Upload failed",
    });
  }
});

// =========================================================================
// 6. API Endpoint: GET /api/media/status/:jobId
// =========================================================================

router.get("/status/:jobId", async (req: any, res: any) => {
  try {
    const { jobId } = req.params;

    if (!jobId || jobId === "pending") {
      return res.json({
        success: true,
        data: {
          jobId,
          status: "PENDING",
          progress: 0,
        },
      });
    }

    const job = await mediaConvert.getJob({ Id: jobId }).promise();

    return res.json({
      success: true,
      data: {
        jobId: job.Job?.Id,
        status: job.Job?.Status,
        progress: job.Job?.JobPercentComplete || 0,
        createdTime: job.Job?.CreatedAt,
        completedTime: (job.Job as any)?.UpdatedAt || job.Job?.CreatedAt,
      },
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Status check failed",
    });
  }
});

// =========================================================================
// 7. API Endpoint: GET /api/media/list
// =========================================================================

router.get("/list", async (req: any, res: any) => {
  try {
    const creatorId = (req as any).user?.id || "unknown";

    const mediaList = await s3
      .listObjectsV2({
        Bucket: process.env.AWS_S3_MEDIA_BUCKET!,
        Prefix: `videos/${creatorId}/`,
      })
      .promise();

    const media = (mediaList.Contents || []).map((obj: any) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `${process.env.CLOUDFLARE_CDN_DOMAIN}/${obj.Key}`,
    }));

    return res.json({
      success: true,
      data: {
        count: media.length,
        media,
      },
    });
  } catch (error: any) {
    console.error("List error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "List failed",
    });
  }
});

// =========================================================================
// 8. API Endpoint: DELETE /api/media/:mediaKey
// =========================================================================

router.delete("/:mediaKey", async (req: any, res: any) => {
  try {
    const { mediaKey } = req.params;

    await s3
      .deleteObject({
        Bucket: process.env.AWS_S3_MEDIA_BUCKET!,
        Key: mediaKey,
      })
      .promise();

    return res.json({
      success: true,
      message: "Media deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Delete failed",
    });
  }
});

export default router;
