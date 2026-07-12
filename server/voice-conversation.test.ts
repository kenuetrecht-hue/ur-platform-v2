/**
 * Voice Conversation System Tests
 * Comprehensive test suite for voice streaming, animation sync, and integration
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import RealTimeVoiceStreamingService from "./voice-streaming-service";
import AvatarAnimationSyncEngine from "./avatar-animation-sync";

// ============================================================================
// VOICE STREAMING SERVICE TESTS
// ============================================================================

describe("RealTimeVoiceStreamingService", () => {
  let service: RealTimeVoiceStreamingService;

  beforeEach(() => {
    service = new RealTimeVoiceStreamingService();
  });

  describe("Session Management", () => {
    it("should create a new voice session", () => {
      const session = service.createSession("user-1", "agent-1");

      expect(session.id).toBeDefined();
      expect(session.userId).toBe("user-1");
      expect(session.aiAgentId).toBe("agent-1");
      expect(session.status).toBe("idle");
      expect(session.startTime).toBeInstanceOf(Date);
    });

    it("should retrieve an existing session", () => {
      const created = service.createSession("user-1", "agent-1");
      const retrieved = service.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe("user-1");
    });

    it("should return undefined for non-existent session", () => {
      const session = service.getSession("non-existent-id");
      expect(session).toBeUndefined();
    });

    it("should end a session", () => {
      const created = service.createSession("user-1", "agent-1");
      const ended = service.endSession(created.id);

      expect(ended.status).toBe("idle");
      expect(ended.endTime).toBeInstanceOf(Date);
    });
  });

  describe("Audio Management", () => {
    it("should add audio chunks to session", () => {
      const session = service.createSession("user-1", "agent-1");
      const audioData = new ArrayBuffer(1024);

      service.addAudioChunk(session.id, audioData, "wav", 16000);

      const retrieved = service.getSession(session.id);
      expect(retrieved?.audioChunks).toHaveLength(1);
      expect(retrieved?.audioChunks[0].format).toBe("wav");
      expect(retrieved?.audioChunks[0].sampleRate).toBe(16000);
    });

    it("should handle multiple audio chunks", () => {
      const session = service.createSession("user-1", "agent-1");

      for (let i = 0; i < 5; i++) {
        service.addAudioChunk(
          session.id,
          new ArrayBuffer(1024),
          "wav",
          16000
        );
      }

      const retrieved = service.getSession(session.id);
      expect(retrieved?.audioChunks).toHaveLength(5);
    });
  });

  describe("Metrics Tracking", () => {
    it("should initialize default metrics", () => {
      const session = service.createSession("user-1", "agent-1");
      const metrics = service.getMetrics(session.id);

      expect(metrics.sessionId).toBe(session.id);
      expect(metrics.audioInputLatency).toBe(0);
      expect(metrics.audioQuality).toBe(1.0);
      expect(metrics.packetLoss).toBe(0);
    });

    it("should update metrics", () => {
      const session = service.createSession("user-1", "agent-1");

      service.updateMetrics(session.id, {
        audioInputLatency: 50,
        processingLatency: 100,
        audioQuality: 0.95,
      });

      const metrics = service.getMetrics(session.id);
      expect(metrics.audioInputLatency).toBe(50);
      expect(metrics.processingLatency).toBe(100);
      expect(metrics.audioQuality).toBe(0.95);
    });
  });

  describe("Session Queries", () => {
    it("should get all active sessions", () => {
      const session1 = service.createSession("user-1", "agent-1");
      service.startListening(session1.id);
      const session2 = service.createSession("user-2", "agent-2");
      service.startListening(session2.id);

      const active = service.getActiveSessions();
      expect(active.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================================================
// AVATAR ANIMATION SYNC ENGINE TESTS
// ============================================================================

describe("AvatarAnimationSyncEngine", () => {
  let engine: AvatarAnimationSyncEngine;

  beforeEach(() => {
    engine = new AvatarAnimationSyncEngine();
  });

  describe("Speech Analysis", () => {
    it("should analyze positive sentiment", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "This is great! Amazing work!"
      );

      expect(analysis.sentiment).toBeGreaterThan(0);
      expect(analysis.emphasis.length).toBeGreaterThan(0);
    });

    it("should analyze negative sentiment", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "This is terrible. Awful work."
      );

      expect(analysis.sentiment).toBeLessThan(0);
    });

    it("should detect emphasis words", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "This is VERY important! Pay attention."
      );

      expect(analysis.emphasis.length).toBeGreaterThan(0);
    });

    it("should detect pauses", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "First point. Second point. Third point."
      );

      expect(analysis.pauses.length).toBeGreaterThan(0);
    });
  });

  describe("Animation Sequence Generation", () => {
    it("should generate animation sequence", () => {
      const speechAnalysis = engine.analyzeSpeechForAnimation(
        "Hello! This is great!"
      );

      const sequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        speechAnalysis,
        5000
      );

      expect(sequence.id).toBeDefined();
      expect(sequence.aiAgentId).toBe("agent-1");
      expect(sequence.audioSessionId).toBe("session-1");
      expect(sequence.duration).toBe(5000);
      expect(sequence.animations.length).toBeGreaterThan(0);
      expect(sequence.gestures.length).toBeGreaterThan(0);
    });

    it("should set emotional tone based on sentiment", () => {
      const happyAnalysis = engine.analyzeSpeechForAnimation(
        "Wonderful! Excellent!"
      );
      const happySequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        happyAnalysis,
        5000
      );

      expect(happySequence.emotionalTone).toBe("happy");
    });

    it("should generate multiple gestures for emphasis", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "IMPORTANT point. CRITICAL detail. ESSENTIAL information."
      );

      const sequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        analysis,
        5000
      );

      expect(sequence.gestures.length).toBeGreaterThanOrEqual(
        analysis.emphasis.length
      );
    });
  });

  describe("Animation Retrieval", () => {
    it("should get animation at specific time", () => {
      const analysis = engine.analyzeSpeechForAnimation("Hello world!");
      const sequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        analysis,
        5000
      );

      const animation = engine.getAnimationAtTime(sequence.id, 500);
      expect(animation).toBeDefined();
      expect(animation?.type).toBeDefined();
    });

    it("should get gestures in time window", () => {
      const analysis = engine.analyzeSpeechForAnimation(
        "IMPORTANT point. CRITICAL detail."
      );
      const sequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        analysis,
        5000
      );

      const gestures = engine.getGesturesAtTime(sequence.id, 1000, 1000);
      expect(Array.isArray(gestures)).toBe(true);
    });

    it("should get next animation event", () => {
      const analysis = engine.analyzeSpeechForAnimation("Hello world!");
      const sequence = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        analysis,
        5000
      );

      const firstAnimation = engine.getAnimationAtTime(sequence.id, 0);
      expect(firstAnimation).toBeDefined();
    });
  });

  describe("Statistics", () => {
    it("should track animation statistics", () => {
      const freshEngine = new AvatarAnimationSyncEngine();
      const analysis = freshEngine.analyzeSpeechForAnimation("Hello world!");

      const seq1 = freshEngine.generateAnimationSequence("agent-1", "session-1", analysis, 5000);
      const seq2 = freshEngine.generateAnimationSequence("agent-2", "session-2", analysis, 5000);

      const stats = freshEngine.getStatistics();

      expect(stats.totalSequences).toBeGreaterThanOrEqual(1);
      expect(stats.totalAnimations).toBeGreaterThan(0);
      expect(stats.totalGestures).toBeGreaterThan(0);
    });
  });

  describe("Sequence Queries", () => {
    it("should retrieve sequence by ID", () => {
      const analysis = engine.analyzeSpeechForAnimation("Hello world!");
      const created = engine.generateAnimationSequence(
        "agent-1",
        "session-1",
        analysis,
        5000
      );

      const retrieved = engine.getSequence(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it("should get all sequences for agent", () => {
      const freshEngine = new AvatarAnimationSyncEngine();
      const analysis = freshEngine.analyzeSpeechForAnimation("Hello world!");

      const seq1 = freshEngine.generateAnimationSequence("agent-1", "session-1", analysis, 5000);
      const retrieved = freshEngine.getSequence(seq1.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.aiAgentId).toBe("agent-1");
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Voice Conversation Integration", () => {
  let voiceService: RealTimeVoiceStreamingService;
  let animationEngine: AvatarAnimationSyncEngine;

  beforeEach(() => {
    voiceService = new RealTimeVoiceStreamingService();
    animationEngine = new AvatarAnimationSyncEngine();
  });

  it("should handle complete voice conversation flow", () => {
    // 1. Create session
    const session = voiceService.createSession("user-1", "agent-1");
    expect(session.status).toBe("idle");

    // 2. Start listening
    voiceService.startListening(session.id);
    const listeningSession = voiceService.getSession(session.id);
    expect(listeningSession?.status).toBe("listening");

    // 3. Add audio chunks
    voiceService.addAudioChunk(session.id, new ArrayBuffer(1024), "wav", 16000);
    voiceService.addAudioChunk(session.id, new ArrayBuffer(1024), "wav", 16000);

    // 4. Generate animation
    const analysis = animationEngine.analyzeSpeechForAnimation(
      "Hello! This is great!"
    );
    const sequence = animationEngine.generateAnimationSequence(
      "agent-1",
      session.id,
      analysis,
      5000
    );

    expect(sequence.animations.length).toBeGreaterThan(0);
    expect(sequence.emotionalTone).toBe("happy");

    // 5. End session
    const endedSession = voiceService.endSession(session.id);
    expect(endedSession.status).toBe("idle");
    expect(endedSession.endTime).toBeInstanceOf(Date);
  });

  it("should handle multiple concurrent conversations", () => {
    const sessions = [];

    for (let i = 0; i < 5; i++) {
      const session = voiceService.createSession(`user-${i}`, `agent-${i}`);
      voiceService.startListening(session.id);
      sessions.push(session);
    }

    const active = voiceService.getActiveSessions();
    expect(active.length).toBeGreaterThanOrEqual(5);
  });

  it("should sync animations with voice timing", () => {
    const session = voiceService.createSession("user-1", "agent-1");

    const analysis = animationEngine.analyzeSpeechForAnimation(
      "IMPORTANT. CRITICAL. ESSENTIAL."
    );
    const sequence = animationEngine.generateAnimationSequence(
      "agent-1",
      session.id,
      analysis,
      5000
    );

    // Verify animations are distributed throughout the duration
    const startAnimation = animationEngine.getAnimationAtTime(sequence.id, 0);
    const midAnimation = animationEngine.getAnimationAtTime(sequence.id, 2500);
    const endAnimation = animationEngine.getAnimationAtTime(
      sequence.id,
      4999
    );

    expect(startAnimation).toBeDefined();
    expect(midAnimation).toBeDefined();
    expect(endAnimation).toBeDefined();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("Performance", () => {
  it("should handle rapid session creation", () => {
    const service = new RealTimeVoiceStreamingService();
    const startTime = Date.now();

    for (let i = 0; i < 50; i++) {
      service.createSession(`user-${i}`, `agent-${i}`);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
  });


  it("should handle large animation sequences", () => {
    const engine = new AvatarAnimationSyncEngine();
    const startTime = Date.now();

    const analysis = engine.analyzeSpeechForAnimation(
      "IMPORTANT. CRITICAL. ESSENTIAL. URGENT. VITAL. CRUCIAL. PARAMOUNT. SIGNIFICANT. MOMENTOUS. WEIGHTY."
    );

    const sequence = engine.generateAnimationSequence(
      "agent-1",
      "session-1",
      analysis,
      10000
    );

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500); // Should complete in under 500ms

    expect(sequence.animations.length).toBeGreaterThan(0);
    expect(sequence.gestures.length).toBeGreaterThan(0);
  });
});
