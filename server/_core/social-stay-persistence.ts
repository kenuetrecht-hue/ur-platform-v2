/**
 * Saves the feed, friends, and messages in MySQL so a restart does not wipe them.
 * Tests keep the in-memory copies and do not touch the database.
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  rememberFeedComment,
  rememberFeedLike,
  rememberFeedPost,
  type FeedComment,
  type FeedPost,
  type PostKind,
  type PostVisibility,
} from "./social-feed-service";
import {
  rememberDirectMessage,
  rememberFriendship,
  type DirectMessage,
  type Friendship,
  type FriendshipStatus,
} from "./social-service";
import type { ContentLicenseType, ContentRightsMode } from "../../lib/creator-content-protection-core";

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

function rowsOf<T>(result: unknown): T[] {
  const list = result as unknown as T[][];
  return Array.isArray(list?.[0]) ? list[0] : [];
}

async function dbOrNull() {
  if (skipPersistence()) return null;
  return getDb();
}

export async function ensureSocialStayTables(): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS urFeedPosts (
      id varchar(64) NOT NULL,
      authorUserId varchar(128) NOT NULL,
      authorName varchar(80) NOT NULL,
      authorAvatar varchar(16) NOT NULL,
      authorVerified tinyint NOT NULL DEFAULT 0,
      body varchar(4000) NOT NULL,
      kind varchar(16) NOT NULL,
      imageUrl varchar(2000) NULL,
      videoUrl varchar(2000) NULL,
      linkUrl varchar(2000) NULL,
      visibility varchar(16) NOT NULL,
      hashtags varchar(500) NOT NULL,
      shareCount int NOT NULL DEFAULT 0,
      hasAffiliateContent tinyint NOT NULL DEFAULT 0,
      hasAiDisclosure tinyint NOT NULL DEFAULT 0,
      contentRightsMode varchar(32) NOT NULL,
      attributionSourceName varchar(80) NULL,
      attributionSourceUrl varchar(2000) NULL,
      licenseType varchar(64) NULL,
      createdAt varchar(40) NOT NULL,
      updatedAt varchar(40) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS urFeedComments (
      id varchar(64) NOT NULL,
      postId varchar(64) NOT NULL,
      authorUserId varchar(128) NOT NULL,
      authorName varchar(80) NOT NULL,
      body varchar(1000) NOT NULL,
      createdAt varchar(40) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS urFeedLikes (
      postId varchar(64) NOT NULL,
      userId varchar(128) NOT NULL,
      PRIMARY KEY (postId, userId)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS urFriendships (
      id varchar(64) NOT NULL,
      userId varchar(128) NOT NULL,
      friendUserId varchar(128) NOT NULL,
      friendEmail varchar(320) NOT NULL,
      friendName varchar(80) NOT NULL,
      status varchar(16) NOT NULL,
      initiatedBy varchar(128) NOT NULL,
      createdAt varchar(40) NOT NULL,
      acceptedAt varchar(40) NULL,
      PRIMARY KEY (id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS urDirectMessages (
      id varchar(64) NOT NULL,
      threadId varchar(260) NOT NULL,
      senderUserId varchar(128) NOT NULL,
      recipientUserId varchar(128) NOT NULL,
      body varchar(2000) NOT NULL,
      deliveredBody varchar(2000) NULL,
      subject varchar(120) NULL,
      senderEmail varchar(320) NULL,
      recipientEmail varchar(320) NULL,
      imageUrl varchar(2000) NULL,
      videoUrl varchar(2000) NULL,
      createdAt varchar(40) NOT NULL,
      readAt varchar(40) NULL,
      PRIMARY KEY (id)
    )
  `);
}

function warn(action: string): void {
  console.warn(`[social] could not ${action}`);
}

export async function saveFeedPost(post: FeedPost): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await ensureSocialStayTables();
    await db.execute(sql`
      INSERT INTO urFeedPosts (
        id, authorUserId, authorName, authorAvatar, authorVerified, body, kind,
        imageUrl, videoUrl, linkUrl, visibility, hashtags, shareCount,
        hasAffiliateContent, hasAiDisclosure, contentRightsMode,
        attributionSourceName, attributionSourceUrl, licenseType, createdAt, updatedAt
      ) VALUES (
        ${post.id}, ${post.authorUserId}, ${post.authorName}, ${post.authorAvatar},
        ${post.authorVerified ? 1 : 0}, ${post.body}, ${post.kind},
        ${post.imageUrl ?? null}, ${post.videoUrl ?? null}, ${post.linkUrl ?? null},
        ${post.visibility}, ${JSON.stringify(post.hashtags)}, ${post.shareCount},
        ${post.hasAffiliateContent ? 1 : 0}, ${post.hasAiDisclosure ? 1 : 0}, ${post.contentRightsMode},
        ${post.attributionSourceName ?? null}, ${post.attributionSourceUrl ?? null}, ${post.licenseType ?? null},
        ${post.createdAt}, ${post.updatedAt}
      )
      ON DUPLICATE KEY UPDATE
        body = ${post.body},
        imageUrl = ${post.imageUrl ?? null},
        videoUrl = ${post.videoUrl ?? null},
        shareCount = ${post.shareCount},
        updatedAt = ${post.updatedAt}
    `);
  } catch {
    warn("save a post");
  }
}

export async function deleteFeedPostRow(postId: string): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await db.execute(sql`DELETE FROM urFeedLikes WHERE postId = ${postId}`);
    await db.execute(sql`DELETE FROM urFeedComments WHERE postId = ${postId}`);
    await db.execute(sql`DELETE FROM urFeedPosts WHERE id = ${postId}`);
  } catch {
    warn("delete a post");
  }
}

export async function saveFeedComment(comment: FeedComment): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await ensureSocialStayTables();
    await db.execute(sql`
      INSERT IGNORE INTO urFeedComments (id, postId, authorUserId, authorName, body, createdAt)
      VALUES (${comment.id}, ${comment.postId}, ${comment.authorUserId}, ${comment.authorName}, ${comment.body}, ${comment.createdAt})
    `);
  } catch {
    warn("save a comment");
  }
}

export async function saveFeedLike(postId: string, userId: string, liked: boolean): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await ensureSocialStayTables();
    if (liked) {
      await db.execute(sql`INSERT IGNORE INTO urFeedLikes (postId, userId) VALUES (${postId}, ${userId})`);
    } else {
      await db.execute(sql`DELETE FROM urFeedLikes WHERE postId = ${postId} AND userId = ${userId}`);
    }
  } catch {
    warn("save a like");
  }
}

export async function saveFriendship(friendship: Friendship): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await ensureSocialStayTables();
    await db.execute(sql`
      INSERT INTO urFriendships (
        id, userId, friendUserId, friendEmail, friendName, status, initiatedBy, createdAt, acceptedAt
      ) VALUES (
        ${friendship.id}, ${friendship.userId}, ${friendship.friendUserId}, ${friendship.friendEmail},
        ${friendship.friendName}, ${friendship.status}, ${friendship.initiatedBy}, ${friendship.createdAt},
        ${friendship.acceptedAt ?? null}
      )
      ON DUPLICATE KEY UPDATE status = ${friendship.status}, acceptedAt = ${friendship.acceptedAt ?? null}
    `);
  } catch {
    warn("save a friendship");
  }
}

export async function saveDirectMessage(message: DirectMessage): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  try {
    await ensureSocialStayTables();
    await db.execute(sql`
      INSERT INTO urDirectMessages (
        id, threadId, senderUserId, recipientUserId, body, deliveredBody, subject,
        senderEmail, recipientEmail, imageUrl, videoUrl, createdAt, readAt
      ) VALUES (
        ${message.id}, ${message.threadId}, ${message.senderUserId}, ${message.recipientUserId},
        ${message.body}, ${message.deliveredBody ?? null}, ${message.subject ?? null},
        ${message.senderEmail ?? null}, ${message.recipientEmail ?? null},
        ${message.imageUrl ?? null}, ${message.videoUrl ?? null}, ${message.createdAt}, ${message.readAt ?? null}
      )
      ON DUPLICATE KEY UPDATE readAt = ${message.readAt ?? null}
    `);
  } catch {
    warn("save a message");
  }
}

const KINDS = new Set<PostKind>(["text", "photo", "video", "link"]);
const VIS = new Set<PostVisibility>(["public", "friends", "members"]);
const FRIEND_STATUS = new Set<FriendshipStatus>(["pending", "accepted", "blocked"]);

let hydrated: Promise<void> | null = null;

export function hydrateSocialStay(): Promise<void> {
  if (skipPersistence()) return Promise.resolve();
  if (!hydrated) {
    hydrated = loadSocialStay()
      .then((ready) => {
        if (!ready) hydrated = null;
      })
      .catch(() => {
        hydrated = null;
      });
  }
  return hydrated ?? Promise.resolve();
}

async function loadSocialStay(): Promise<boolean> {
  const db = await dbOrNull();
  if (!db) return false;
  try {
    await ensureSocialStayTables();
    const postRows = rowsOf<Record<string, unknown>>(
      await db.execute(sql`SELECT * FROM urFeedPosts ORDER BY createdAt DESC LIMIT 500`),
    );
    for (const row of postRows) {
      const kind = String(row.kind ?? "");
      const visibility = String(row.visibility ?? "");
      if (!KINDS.has(kind as PostKind) || !VIS.has(visibility as PostVisibility)) continue;
      let hashtags: string[] = [];
      try {
        const parsed = JSON.parse(String(row.hashtags ?? "[]"));
        if (Array.isArray(parsed)) hashtags = parsed.map((tag) => String(tag)).slice(0, 10);
      } catch {
        hashtags = [];
      }
      const post: FeedPost = {
        id: String(row.id),
        authorUserId: String(row.authorUserId),
        authorName: String(row.authorName ?? "UR Member"),
        authorAvatar: String(row.authorAvatar ?? ""),
        authorVerified: Boolean(row.authorVerified),
        body: String(row.body ?? ""),
        kind: kind as PostKind,
        imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
        videoUrl: row.videoUrl ? String(row.videoUrl) : undefined,
        linkUrl: row.linkUrl ? String(row.linkUrl) : undefined,
        visibility: visibility as PostVisibility,
        hashtags,
        likeCount: 0,
        commentCount: 0,
        shareCount: Number(row.shareCount ?? 0) || 0,
        hasAffiliateContent: Boolean(row.hasAffiliateContent),
        hasAiDisclosure: Boolean(row.hasAiDisclosure),
        contentRightsMode: (String(row.contentRightsMode ?? "original") as ContentRightsMode) || "original",
        attributionSourceName: row.attributionSourceName ? String(row.attributionSourceName) : undefined,
        attributionSourceUrl: row.attributionSourceUrl ? String(row.attributionSourceUrl) : undefined,
        licenseType: row.licenseType ? (String(row.licenseType) as ContentLicenseType) : undefined,
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt ?? row.createdAt),
      };
      rememberFeedPost(post);
    }
    const likeRows = rowsOf<{ postId: string; userId: string }>(
      await db.execute(sql`SELECT postId, userId FROM urFeedLikes LIMIT 5000`),
    );
    for (const row of likeRows) rememberFeedLike(String(row.postId), String(row.userId));
    const commentRows = rowsOf<FeedComment>(
      await db.execute(sql`SELECT id, postId, authorUserId, authorName, body, createdAt FROM urFeedComments ORDER BY createdAt ASC LIMIT 2000`),
    );
    for (const row of commentRows) {
      rememberFeedComment({
        id: String(row.id),
        postId: String(row.postId),
        authorUserId: String(row.authorUserId),
        authorName: String(row.authorName),
        body: String(row.body),
        createdAt: String(row.createdAt),
      });
    }
    const friendRows = rowsOf<Record<string, unknown>>(
      await db.execute(sql`SELECT * FROM urFriendships ORDER BY createdAt DESC LIMIT 5000`),
    );
    for (const row of friendRows) {
      const status = String(row.status ?? "");
      if (!FRIEND_STATUS.has(status as FriendshipStatus)) continue;
      const friendship: Friendship = {
        id: String(row.id),
        userId: String(row.userId),
        friendUserId: String(row.friendUserId),
        friendEmail: String(row.friendEmail ?? ""),
        friendName: String(row.friendName ?? "Friend"),
        status: status as FriendshipStatus,
        initiatedBy: String(row.initiatedBy),
        createdAt: String(row.createdAt),
        acceptedAt: row.acceptedAt ? String(row.acceptedAt) : undefined,
      };
      rememberFriendship(friendship);
    }
    const messageRows = rowsOf<Record<string, unknown>>(
      await db.execute(sql`SELECT * FROM urDirectMessages ORDER BY createdAt DESC LIMIT 500`),
    );
    for (const row of messageRows) {
      const message: DirectMessage = {
        id: String(row.id),
        threadId: String(row.threadId),
        senderUserId: String(row.senderUserId),
        recipientUserId: String(row.recipientUserId),
        body: String(row.body ?? ""),
        deliveredBody: row.deliveredBody ? String(row.deliveredBody) : undefined,
        subject: row.subject ? String(row.subject) : undefined,
        senderEmail: row.senderEmail ? String(row.senderEmail) : undefined,
        recipientEmail: row.recipientEmail ? String(row.recipientEmail) : undefined,
        imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
        videoUrl: row.videoUrl ? String(row.videoUrl) : undefined,
        createdAt: String(row.createdAt),
        readAt: row.readAt ? String(row.readAt) : undefined,
      };
      rememberDirectMessage(message);
    }
    return true;
  } catch {
    warn("load posts and messages");
    return false;
  }
}
