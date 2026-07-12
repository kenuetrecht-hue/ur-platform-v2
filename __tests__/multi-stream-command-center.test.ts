import { describe, it, expect, beforeEach } from 'vitest';
import { MultiStreamCommandCenterService } from '../lib/multi-stream-command-center';

describe('Multi-Stream Command Center Service', () => {
  let service: MultiStreamCommandCenterService;
  const creatorId = 'creator_123';

  beforeEach(() => {
    service = new MultiStreamCommandCenterService();
  });

  describe('Platform Management', () => {
    it('should connect streaming platform', () => {
      const platform = service.connectPlatform('youtube', 'stream_key_123', 'rtmp://youtube.com/live');

      expect(platform).toBeDefined();
      expect(platform.platformId).toBeDefined();
      expect(platform.name).toBe('youtube');
      expect(platform.isConnected).toBe(true);
      expect(platform.streamKey).toBe('stream_key_123');
    });

    it('should connect multiple platforms', () => {
      const youtube = service.connectPlatform('youtube', 'yt_key', 'rtmp://youtube.com/live');
      const twitch = service.connectPlatform('twitch', 'twitch_key', 'rtmp://twitch.tv/live');
      const facebook = service.connectPlatform('facebook', 'fb_key', 'rtmp://facebook.com/live');

      const platforms = service.getConnectedPlatforms();
      expect(platforms).toHaveLength(3);
      expect(platforms.some(p => p.name === 'youtube')).toBe(true);
      expect(platforms.some(p => p.name === 'twitch')).toBe(true);
      expect(platforms.some(p => p.name === 'facebook')).toBe(true);
    });

    it('should get platform details', () => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const retrieved = service.getPlatform(platform.platformId);

      expect(retrieved?.platformId).toBe(platform.platformId);
      expect(retrieved?.name).toBe('youtube');
    });
  });

  describe('Multi-Stream Management', () => {
    let youtubeId: string;
    let twitchId: string;

    beforeEach(() => {
      const yt = service.connectPlatform('youtube', 'yt_key', 'rtmp://youtube.com/live');
      const tw = service.connectPlatform('twitch', 'tw_key', 'rtmp://twitch.tv/live');
      youtubeId = yt.platformId;
      twitchId = tw.platformId;
    });

    it('should start multi-platform stream', () => {
      const stream = service.startMultiStream(
        creatorId,
        'Live Gaming Session',
        'Playing the latest game',
        'gaming',
        [youtubeId, twitchId],
        '1080p',
        5000
      );

      expect(stream).toBeDefined();
      expect(stream.streamId).toBeDefined();
      expect(stream.creatorId).toBe(creatorId);
      expect(stream.title).toBe('Live Gaming Session');
      expect(stream.platforms).toHaveLength(2);
      expect(stream.status).toBe('live');
      expect(stream.streamQuality).toBe('1080p');
      expect(stream.bitrate).toBe(5000);
      expect(stream.isRecording).toBe(true);
    });

    it('should get active stream', () => {
      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [youtubeId],
        '720p'
      );

      const retrieved = service.getStream(stream.streamId);
      expect(retrieved?.streamId).toBe(stream.streamId);
      expect(retrieved?.title).toBe('Test Stream');
    });

    it('should get creator active streams', () => {
      service.startMultiStream(creatorId, 'Stream 1', 'Desc', 'cat', [youtubeId]);
      service.startMultiStream(creatorId, 'Stream 2', 'Desc', 'cat', [twitchId]);
      service.startMultiStream('other_creator', 'Stream 3', 'Desc', 'cat', [youtubeId]);

      const creatorStreams = service.getCreatorActiveStreams(creatorId);
      expect(creatorStreams).toHaveLength(2);
      expect(creatorStreams.every(s => s.creatorId === creatorId)).toBe(true);
    });

    it('should end stream', () => {
      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [youtubeId]
      );

      expect(stream.status).toBe('live');

      const ended = service.endStream(stream.streamId);
      expect(ended?.status).toBe('ended');
      expect(ended?.endTime).toBeDefined();
    });
  });

  describe('Viewer and Engagement Tracking', () => {
    let streamId: string;
    let platformId: string;

    beforeEach(() => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      platformId = platform.platformId;

      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [platformId]
      );
      streamId = stream.streamId;
    });

    it('should update viewer count', () => {
      const updated = service.updateViewerCount(streamId, platformId, 150);
      expect(updated).toBe(true);

      const stream = service.getStream(streamId);
      expect(stream?.viewers.current).toBeGreaterThan(0);
    });

    it('should track peak viewers', () => {
      service.updateViewerCount(streamId, platformId, 100);
      service.updateViewerCount(streamId, platformId, 200);
      service.updateViewerCount(streamId, platformId, 150);

      const stream = service.getStream(streamId);
      expect(stream?.viewers.peak).toBe(200);
    });

    it('should add engagement (likes)', () => {
      const stream1 = service.getStream(streamId);
      const initialLikes = stream1?.engagement.likes || 0;

      service.addEngagement(streamId, 'like');
      service.addEngagement(streamId, 'like');

      const stream2 = service.getStream(streamId);
      expect(stream2?.engagement.likes).toBe(initialLikes + 2);
    });

    it('should add engagement (shares)', () => {
      const stream1 = service.getStream(streamId);
      const initialShares = stream1?.engagement.shares || 0;

      service.addEngagement(streamId, 'share');

      const stream2 = service.getStream(streamId);
      expect(stream2?.engagement.shares).toBe(initialShares + 1);
    });

    it('should add engagement (super chat) and track revenue', () => {
      const stream1 = service.getStream(streamId);
      const initialRevenue = stream1?.monetization.totalRevenue || 0;

      service.addEngagement(streamId, 'super_chat', 10);
      service.addEngagement(streamId, 'super_chat', 5);

      const stream2 = service.getStream(streamId);
      expect(stream2?.engagement.superChats).toBe(2);
      expect(stream2?.monetization.superChatRevenue).toBe(15);
      expect(stream2?.monetization.totalRevenue).toBe(initialRevenue + 15);
    });
  });

  describe('Chat Management', () => {
    let streamId: string;

    beforeEach(() => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [platform.platformId]
      );
      streamId = stream.streamId;
    });

    it('should add chat message', () => {
      const message = service.addChatMessage(
        streamId,
        'youtube',
        'user_123',
        'JohnDoe',
        'This is awesome!',
        false
      );

      expect(message).toBeDefined();
      expect(message.messageId).toBeDefined();
      expect(message.username).toBe('JohnDoe');
      expect(message.message).toBe('This is awesome!');
      expect(message.sentiment).toBe('positive');
    });

    it('should get stream chat', () => {
      service.addChatMessage(streamId, 'youtube', 'user_1', 'User1', 'Message 1', false);
      service.addChatMessage(streamId, 'youtube', 'user_2', 'User2', 'Message 2', false);
      service.addChatMessage(streamId, 'youtube', 'user_3', 'User3', 'Message 3', false);

      const chat = service.getStreamChat(streamId);
      expect(chat.length).toBeGreaterThanOrEqual(3);
    });

    it('should analyze sentiment', () => {
      const positive = service.addChatMessage(
        streamId,
        'youtube',
        'user_1',
        'User1',
        'This is amazing and awesome!',
        false
      );
      expect(positive.sentiment).toBe('positive');

      const negative = service.addChatMessage(
        streamId,
        'youtube',
        'user_2',
        'User2',
        'This is terrible and awful',
        false
      );
      expect(negative.sentiment).toBe('negative');

      const neutral = service.addChatMessage(
        streamId,
        'youtube',
        'user_3',
        'User3',
        'Just watching',
        false
      );
      expect(neutral.sentiment).toBe('neutral');
    });
  });

  describe('Stream Scheduling', () => {
    it('should schedule stream', () => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const schedule = service.scheduleStream(
        creatorId,
        'Upcoming Stream',
        'Description',
        scheduledTime,
        120, // 2 hours
        [platform.platformId],
        'gaming'
      );

      expect(schedule).toBeDefined();
      expect(schedule.scheduleId).toBeDefined();
      expect(schedule.title).toBe('Upcoming Stream');
      expect(schedule.status).toBe('scheduled');
      expect(schedule.notifyFollowers).toBe(true);
    });

    it('should get creator scheduled streams', () => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      service.scheduleStream(creatorId, 'Stream 1', 'Desc', futureTime, 120, [platform.platformId], 'gaming');
      service.scheduleStream(creatorId, 'Stream 2', 'Desc', futureTime, 120, [platform.platformId], 'music');
      service.scheduleStream('other_creator', 'Stream 3', 'Desc', futureTime, 120, [platform.platformId], 'gaming');

      const scheduled = service.getCreatorScheduledStreams(creatorId);
      expect(scheduled).toHaveLength(2);
      expect(scheduled.every(s => s.creatorId === creatorId)).toBe(true);
    });
  });

  describe('Moderation', () => {
    let streamId: string;

    beforeEach(() => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [platform.platformId]
      );
      streamId = stream.streamId;
    });

    it('should add moderation rule for keywords', () => {
      const rule = service.addModerationRule(
        streamId,
        'keyword',
        'delete',
        ['badword1', 'badword2']
      );

      expect(rule).toBeDefined();
      expect(rule.ruleId).toBeDefined();
      expect(rule.ruleType).toBe('keyword');
      expect(rule.isActive).toBe(true);
    });

    it('should filter messages based on moderation rules', () => {
      service.addModerationRule(streamId, 'keyword', 'delete', ['spam', 'badword']);

      const filtered = service.addChatMessage(
        streamId,
        'youtube',
        'user_1',
        'User1',
        'This is spam content',
        false
      );

      expect(filtered.message).toBe('[Filtered]');
    });

    it('should get moderation rules', () => {
      service.addModerationRule(streamId, 'keyword', 'delete', ['word1']);
      service.addModerationRule(streamId, 'keyword', 'delete', ['word2']);

      const rules = service.getModerationRules(streamId);
      expect(rules).toHaveLength(2);
    });
  });

  describe('Stream Overlays', () => {
    let streamId: string;

    beforeEach(() => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [platform.platformId]
      );
      streamId = stream.streamId;
    });

    it('should add stream overlay', () => {
      const overlay = service.addOverlay(
        streamId,
        'donation_goal',
        { x: 10, y: 10 },
        { width: 300, height: 100 },
        { goal: 1000, current: 250 }
      );

      expect(overlay).toBeDefined();
      expect(overlay.overlayId).toBeDefined();
      expect(overlay.type).toBe('donation_goal');
      expect(overlay.isVisible).toBe(true);
    });

    it('should get stream overlays', () => {
      service.addOverlay(streamId, 'donation_goal', { x: 10, y: 10 }, { width: 300, height: 100 });
      service.addOverlay(streamId, 'chat_box', { x: 20, y: 20 }, { width: 400, height: 300 });

      const overlays = service.getStreamOverlays(streamId);
      expect(overlays).toHaveLength(2);
      expect(overlays.some(o => o.type === 'donation_goal')).toBe(true);
      expect(overlays.some(o => o.type === 'chat_box')).toBe(true);
    });
  });

  describe('Stream Analytics', () => {
    let streamId: string;
    let platformId: string;

    beforeEach(() => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');
      platformId = platform.platformId;

      const stream = service.startMultiStream(
        creatorId,
        'Test Stream',
        'Description',
        'category',
        [platformId]
      );
      streamId = stream.streamId;
    });

    it('should generate analytics after stream ends', () => {
      service.updateViewerCount(streamId, platformId, 100);
      service.addEngagement(streamId, 'like');
      service.addEngagement(streamId, 'super_chat', 10);

      service.endStream(streamId);

      const analytics = service.getStreamAnalytics(streamId);
      expect(analytics).toBeDefined();
      expect(analytics?.metrics.totalViewers).toBeGreaterThan(0);
      expect(analytics?.revenue.superChatRevenue).toBe(10);
    });
  });

  describe('Stream Statistics Summary', () => {
    it('should get stream statistics summary', () => {
      const platform = service.connectPlatform('youtube', 'key', 'rtmp://url');

      service.startMultiStream(creatorId, 'Stream 1', 'Desc', 'cat', [platform.platformId]);
      service.startMultiStream(creatorId, 'Stream 2', 'Desc', 'cat', [platform.platformId]);

      const stats = service.getStreamStatsSummary(creatorId);

      expect(stats).toBeDefined();
      expect(stats.totalStreams).toBe(2);
      expect(stats.activeStreams).toBe(2);
      expect(stats.totalViewers).toBeGreaterThanOrEqual(0);
      expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});
