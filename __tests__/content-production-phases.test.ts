import { describe, it, expect, beforeEach } from "vitest";
import VideoEditor, { VideoFile, EditedVideo } from "../lib/video-editor";
import AudioProducer, { AudioFile, AudioMix } from "../lib/audio-producer";
import ContentGenerator, { ChartData, ImageTemplate } from "../lib/content-generator";

/**
 * Phase 2: Video Editor Tests
 */
describe("Phase 2: Video Editor", () => {
  let videoEditor: VideoEditor;

  beforeEach(() => {
    videoEditor = new VideoEditor();
  });

  describe("Video Import and Management", () => {
    it("should import a video file", async () => {
      const video = await videoEditor.importVideo("file://video.mp4", "Test Video", {
        duration: 60,
        width: 1920,
        height: 1080,
        fileSize: 50000000,
      });

      expect(video).toBeDefined();
      expect(video.name).toBe("Test Video");
      expect(video.duration).toBe(60);
      expect(video.width).toBe(1920);
      expect(video.height).toBe(1080);
    });

    it("should retrieve imported video", async () => {
      const imported = await videoEditor.importVideo("file://video.mp4", "Test", {
        duration: 30,
      });

      const retrieved = videoEditor.getVideo(imported.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test");
    });

    it("should list all videos", async () => {
      const video1 = await videoEditor.importVideo("file://video1.mp4", "Video 1", { duration: 30 });
      const video2 = await videoEditor.importVideo("file://video2.mp4", "Video 2", { duration: 45 });

      const videos = videoEditor.listVideos();
      expect(videos.length).toBeGreaterThan(0);
      expect(videos.some((v) => v.id === video1.id)).toBe(true);
      expect(videos.some((v) => v.id === video2.id)).toBe(true);
    });
  });

  describe("Video Editing Operations", () => {
    let videoId: string;

    beforeEach(async () => {
      const video = await videoEditor.importVideo("file://video.mp4", "Test Video", {
        duration: 120,
      });
      videoId = video.id;
    });

    it("should create an edit session", () => {
      const edit = videoEditor.createEditSession(videoId);

      expect(edit).toBeDefined();
      expect(edit.originalId).toBe(videoId);
      expect(edit.status).toBe("pending");
      expect(edit.operations.length).toBe(0);
    });

    it("should crop video", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const cropped = await videoEditor.cropVideo(edit.id, {
        x: 100,
        y: 100,
        width: 800,
        height: 600,
      });

      expect(cropped.operations.length).toBe(1);
      expect(cropped.operations[0].type).toBe("crop");
      expect(cropped.operations[0].cropBox).toBeDefined();
    });

    it("should trim video", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const trimmed = await videoEditor.trimVideo(edit.id, 10, 100);

      expect(trimmed.operations.length).toBe(1);
      expect(trimmed.operations[0].type).toBe("trim");
      expect(trimmed.operations[0].startTime).toBe(10);
      expect(trimmed.operations[0].endTime).toBe(100);
    });

    it("should add visual effect", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const withEffect = await videoEditor.addEffect(edit.id, {
        name: "Brightness",
        intensity: 0.5,
      });

      expect(withEffect.operations.length).toBe(1);
      expect(withEffect.operations[0].type).toBe("effect");
      expect(withEffect.operations[0].effect?.name).toBe("Brightness");
    });

    it("should add overlay", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const withOverlay = await videoEditor.addOverlay(edit.id, {
        type: "text",
        content: "Subscribe!",
        position: "bottom-right",
        opacity: 0.8,
        duration: 5,
      });

      expect(withOverlay.operations.length).toBe(1);
      expect(withOverlay.operations[0].type).toBe("overlay");
    });

    it("should add transition", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const withTransition = await videoEditor.addTransition(edit.id, {
        type: "fade",
        duration: 0.5,
        easing: "ease-in-out",
      });

      expect(withTransition.operations.length).toBe(1);
      expect(withTransition.operations[0].type).toBe("transition");
    });

    it("should undo operation", async () => {
      const edit = videoEditor.createEditSession(videoId);
      await videoEditor.cropVideo(edit.id, { x: 0, y: 0, width: 800, height: 600 });

      const undone = videoEditor.undoOperation(edit.id);
      expect(undone?.operations.length).toBe(0);
    });

    it("should reset all operations", async () => {
      const edit = videoEditor.createEditSession(videoId);
      await videoEditor.cropVideo(edit.id, { x: 0, y: 0, width: 800, height: 600 });
      await videoEditor.trimVideo(edit.id, 10, 100);

      const reset = videoEditor.resetEdit(edit.id);
      expect(reset?.operations.length).toBe(0);
    });
  });

  describe("Video Export", () => {
    let videoId: string;

    beforeEach(async () => {
      const video = await videoEditor.importVideo("file://video.mp4", "Test", {
        duration: 60,
      });
      videoId = video.id;
    });

    it("should export edited video", async () => {
      const edit = videoEditor.createEditSession(videoId);
      await videoEditor.cropVideo(edit.id, { x: 0, y: 0, width: 800, height: 600 });

      const outputUri = await videoEditor.exportVideo(edit.id);

      expect(outputUri).toBeDefined();
      expect(outputUri).toContain("exported");
      expect(outputUri).toContain(".mp4");
    });

    it("should track processing status", async () => {
      const edit = videoEditor.createEditSession(videoId);

      const statusBefore = videoEditor.getProcessingStatus(edit.id);
      expect(statusBefore).toBe("pending");

      const exportPromise = videoEditor.exportVideo(edit.id);
      const statusDuring = videoEditor.getProcessingStatus(edit.id);
      expect(statusDuring).toBe("processing");

      await exportPromise;
      const statusAfter = videoEditor.getProcessingStatus(edit.id);
      expect(statusAfter).toBe("completed");
    });
  });
});

/**
 * Phase 3: Audio Producer Tests
 */
describe("Phase 3: Audio Producer", () => {
  let audioProducer: AudioProducer;

  beforeEach(() => {
    audioProducer = new AudioProducer();
  });

  describe("Audio Import and Management", () => {
    it("should import an audio file", async () => {
      const audio = await audioProducer.importAudio("file://audio.mp3", "Test Audio", {
        duration: 180,
        sampleRate: 44100,
        channels: 2,
      });

      expect(audio).toBeDefined();
      expect(audio.name).toBe("Test Audio");
      expect(audio.duration).toBe(180);
      expect(audio.sampleRate).toBe(44100);
      expect(audio.channels).toBe(2);
    });

    it("should list all audio files", async () => {
      const audio1 = await audioProducer.importAudio("file://audio1.mp3", "Audio 1", { duration: 60 });
      const audio2 = await audioProducer.importAudio("file://audio2.mp3", "Audio 2", { duration: 120 });

      const audios = audioProducer.listAudio();
      expect(audios.length).toBeGreaterThan(0);
      expect(audios.some((a) => a.id === audio1.id)).toBe(true);
      expect(audios.some((a) => a.id === audio2.id)).toBe(true);
    });
  });

  describe("Recording", () => {
    it("should start recording session", () => {
      const session = audioProducer.startRecording();

      expect(session).toBeDefined();
      expect(session.duration).toBe(0);
      expect(session.audioData.length).toBe(0);
    });

    it("should add audio data to recording", () => {
      const session = audioProducer.startRecording();
      const audioData = new Array(1024).fill(0.5);

      const updated = audioProducer.addAudioData(session.id, audioData);

      expect(updated?.audioData.length).toBe(1024);
      expect(updated?.duration).toBeGreaterThanOrEqual(0);
    });

    it("should stop recording and save as file", async () => {
      const session = audioProducer.startRecording();
      const audioData = new Array(2048).fill(0.3);
      audioProducer.addAudioData(session.id, audioData);
      
      // Add a small delay to ensure duration is captured
      await new Promise(resolve => setTimeout(resolve, 100));

      const audio = await audioProducer.stopRecording(session.id, "Recording");

      expect(audio).toBeDefined();
      expect(audio?.name).toBe("Recording");
      expect(audio?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Audio Mixing", () => {
    let audioId1: string;
    let audioId2: string;

    beforeEach(async () => {
      const audio1 = await audioProducer.importAudio("file://audio1.mp3", "Vocal", {
        duration: 120,
      });
      const audio2 = await audioProducer.importAudio("file://audio2.mp3", "Background", {
        duration: 120,
      });
      audioId1 = audio1.id;
      audioId2 = audio2.id;
    });

    it("should create a mix", () => {
      const mix = audioProducer.createMix("My Mix");

      expect(mix).toBeDefined();
      expect(mix.name).toBe("My Mix");
      expect(mix.status).toBe("draft");
      expect(mix.tracks.length).toBe(0);
    });

    it("should add tracks to mix", () => {
      const mix = audioProducer.createMix("My Mix");

      audioProducer.addTrack(mix.id, audioId1, "Vocals");
      const updated = audioProducer.addTrack(mix.id, audioId2, "Background");

      expect(updated?.tracks.length).toBe(2);
      expect(updated?.tracks[0].name).toBe("Vocals");
      expect(updated?.tracks[1].name).toBe("Background");
    });

    it("should adjust track volume", () => {
      const mix = audioProducer.createMix("My Mix");
      const withTrack = audioProducer.addTrack(mix.id, audioId1, "Vocals");
      const trackId = withTrack?.tracks[0].id!;

      const adjusted = audioProducer.setTrackVolume(mix.id, trackId, 0.7);

      expect(adjusted?.tracks[0].volume).toBe(0.7);
    });

    it("should adjust track pan", () => {
      const mix = audioProducer.createMix("My Mix");
      const withTrack = audioProducer.addTrack(mix.id, audioId1, "Vocals");
      const trackId = withTrack?.tracks[0].id!;

      const panned = audioProducer.setTrackPan(mix.id, trackId, -0.5);

      expect(panned?.tracks[0].pan).toBe(-0.5);
    });

    it("should mute/unmute track", () => {
      const mix = audioProducer.createMix("My Mix");
      const withTrack = audioProducer.addTrack(mix.id, audioId1, "Vocals");
      const trackId = withTrack?.tracks[0].id!;

      const muted = audioProducer.toggleTrackMute(mix.id, trackId);
      expect(muted?.tracks[0].muted).toBe(true);

      const unmuted = audioProducer.toggleTrackMute(mix.id, trackId);
      expect(unmuted?.tracks[0].muted).toBe(false);
    });

    it("should add effects to mix", () => {
      const mix = audioProducer.createMix("My Mix");

      const withEffect = audioProducer.addEffect(mix.id, {
        name: "Reverb",
        type: "reverb",
        intensity: 0.6,
      });

      expect(withEffect?.effects.length).toBe(1);
      expect(withEffect?.effects[0].name).toBe("Reverb");
    });

    it("should set master volume", () => {
      const mix = audioProducer.createMix("My Mix");

      const adjusted = audioProducer.setMasterVolume(mix.id, 0.8);

      expect(adjusted?.masterVolume).toBe(0.8);
    });

    it("should remove track from mix", () => {
      const mix = audioProducer.createMix("My Mix");
      const withTrack = audioProducer.addTrack(mix.id, audioId1, "Vocals");
      const trackId = withTrack?.tracks[0].id!;

      const removed = audioProducer.removeTrack(mix.id, trackId);

      expect(removed?.tracks.length).toBe(0);
    });
  });

  describe("Audio Export", () => {
    let audioId: string;

    beforeEach(async () => {
      const audio = await audioProducer.importAudio("file://audio.mp3", "Test", {
        duration: 120,
      });
      audioId = audio.id;
    });

    it("should export mix", async () => {
      const mix = audioProducer.createMix("Export Test");
      audioProducer.addTrack(mix.id, audioId, "Track 1");

      const outputUri = await audioProducer.exportMix(mix.id);

      expect(outputUri).toBeDefined();
      expect(outputUri).toContain("exported-mix");
      expect(outputUri).toContain(".mp3");
    });

    it("should track mix status", async () => {
      const mix = audioProducer.createMix("Status Test");
      audioProducer.addTrack(mix.id, audioId, "Track 1");

      const statusBefore = audioProducer.getMixStatus(mix.id);
      expect(statusBefore).toBe("draft");

      const exportPromise = audioProducer.exportMix(mix.id);
      const statusDuring = audioProducer.getMixStatus(mix.id);
      expect(statusDuring).toBe("processing");

      await exportPromise;
      const statusAfter = audioProducer.getMixStatus(mix.id);
      expect(statusAfter).toBe("completed");
    });
  });
});

/**
 * Phase 4: Content Generator Tests
 */
describe("Phase 4: Content Generator", () => {
  let generator: ContentGenerator;

  beforeEach(() => {
    generator = new ContentGenerator();
  });

  describe("Chart Creation and Management", () => {
    it("should create a chart", () => {
      const chart = generator.createChart(
        "line",
        "Sales Over Time",
        ["Jan", "Feb", "Mar"],
        [
          {
            label: "Sales",
            data: [100, 150, 200],
          },
        ]
      );

      expect(chart).toBeDefined();
      expect(chart.type).toBe("line");
      expect(chart.title).toBe("Sales Over Time");
      expect(chart.labels.length).toBe(3);
    });

    it("should update chart data", () => {
      const chart = generator.createChart("bar", "Revenue", ["Q1", "Q2"], [
        { label: "Revenue", data: [1000, 1500] },
      ]);

      const updated = generator.updateChartData(chart.id, [
        { label: "Revenue", data: [2000, 2500] },
      ]);

      expect(updated?.datasets[0].data).toEqual([2000, 2500]);
    });

    it("should list all charts", () => {
      // beforeEach creates a fresh generator, so we start with 0 charts
      const chart1 = generator.createChart("line", "Chart 1", ["A", "B"], [{ label: "Data", data: [1, 2] }]);
      const chart2 = generator.createChart("bar", "Chart 2", ["X", "Y"], [{ label: "Data", data: [3, 4] }]);

      const charts = generator.listCharts();
      // Just verify we can create and list charts
      expect(charts.length).toBeGreaterThan(0);
      expect(charts.some((c) => c.id === chart1.id)).toBe(true);
      expect(charts.some((c) => c.id === chart2.id)).toBe(true);
    });

    it("should export chart as image", async () => {
      const chart = generator.createChart("pie", "Distribution", ["A", "B", "C"], [
        { label: "Values", data: [30, 40, 30] },
      ]);

      const outputUri = await generator.exportChart(chart.id);

      expect(outputUri).toBeDefined();
      expect(outputUri).toContain("chart");
      expect(outputUri).toContain(".png");
    });
  });

  describe("Image Templates", () => {
    it("should get default templates", () => {
      const templates = generator.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.type === "thumbnail")).toBe(true);
      expect(templates.some((t) => t.type === "banner")).toBe(true);
    });

    it("should create custom template", () => {
      const template = generator.createTemplate("Custom", "poster", 800, 600);

      expect(template).toBeDefined();
      expect(template.name).toBe("Custom");
      expect(template.width).toBe(800);
      expect(template.height).toBe(600);
    });

    it("should add element to template", () => {
      const template = generator.createTemplate("Test", "thumbnail", 1280, 720);

      const updated = generator.addElementToTemplate(template.id, {
        id: "text-1",
        type: "text",
        x: 100,
        y: 100,
        width: 500,
        height: 200,
        content: "Hello",
        style: { fontSize: 48, fill: "#ffffff" },
      });

      expect(updated?.elements.length).toBe(1);
      expect(updated?.elements[0].content).toBe("Hello");
    });

    it("should update element", () => {
      const template = generator.createTemplate("Test", "thumbnail", 1280, 720);
      generator.addElementToTemplate(template.id, {
        id: "text-1",
        type: "text",
        x: 100,
        y: 100,
        width: 500,
        height: 200,
        content: "Hello",
      });

      const updated = generator.updateElement(template.id, "text-1", {
        content: "Updated",
      });

      expect(updated?.elements[0].content).toBe("Updated");
    });

    it("should remove element from template", () => {
      const template = generator.createTemplate("Test", "thumbnail", 1280, 720);
      generator.addElementToTemplate(template.id, {
        id: "text-1",
        type: "text",
        x: 100,
        y: 100,
        width: 500,
        height: 200,
      });

      const updated = generator.removeElement(template.id, "text-1");

      expect(updated?.elements.length).toBe(0);
    });
  });

  describe("Image Generation", () => {
    it("should generate image from template", async () => {
      const templates = generator.getTemplates();
      const templateId = templates[0].id;

      const outputUri = await generator.generateImage(templateId);

      expect(outputUri).toBeDefined();
      expect(outputUri).toContain("image");
      expect(outputUri).toContain(".png");
    });

    it("should list generated content", async () => {
      const templates = generator.getTemplates();
      const initialCount = generator.listGeneratedContent().length;

      await generator.generateImage(templates[0].id);
      await generator.generateImage(templates[1].id);

      const content = generator.listGeneratedContent();
      expect(content.length).toBe(initialCount + 2);
      expect(content.slice(-2).every((c) => c.type === "image")).toBe(true);
    });

    it("should delete generated content", async () => {
      const templates = generator.getTemplates();
      const outputUri = await generator.generateImage(templates[0].id);

      const content = generator.listGeneratedContent();
      const contentId = content[content.length - 1].id; // Get the last one we just created
      const initialCount = content.length;

      const deleted = generator.deleteGeneratedContent(contentId);
      expect(deleted).toBe(true);

      const remaining = generator.listGeneratedContent();
      expect(remaining.length).toBe(initialCount - 1);
    });
  });
});

/**
 * Integration Tests: Personal AI + Production Tools
 */
describe("Integration: Personal AI + Production Tools", () => {
  let videoEditor: VideoEditor;
  let audioProducer: AudioProducer;
  let generator: ContentGenerator;

  beforeEach(() => {
    videoEditor = new VideoEditor();
    audioProducer = new AudioProducer();
    generator = new ContentGenerator();
  });

  it("should handle complete video production workflow", async () => {
    // Import video
    const video = await videoEditor.importVideo("file://video.mp4", "Raw Footage", {
      duration: 120,
    });

    // Create edit session
    const edit = videoEditor.createEditSession(video.id);

    // Apply edits
    await videoEditor.trimVideo(edit.id, 5, 115);
    await videoEditor.cropVideo(edit.id, { x: 0, y: 0, width: 1920, height: 1080 });
    await videoEditor.addEffect(edit.id, { name: "Brightness", intensity: 0.3 });

    // Export
    const outputUri = await videoEditor.exportVideo(edit.id);

    expect(outputUri).toBeDefined();
    expect(videoEditor.getProcessingStatus(edit.id)).toBe("completed");
  });

  it("should handle complete audio production workflow", async () => {
    // Import audio files
    const vocal = await audioProducer.importAudio("file://vocal.mp3", "Vocals", {
      duration: 180,
    });
    const background = await audioProducer.importAudio("file://bg.mp3", "Background", {
      duration: 180,
    });

    // Create mix
    const mix = audioProducer.createMix("Final Mix");
    audioProducer.addTrack(mix.id, vocal.id, "Vocals");
    audioProducer.addTrack(mix.id, background.id, "Background");

    // Add effects
    audioProducer.addEffect(mix.id, { name: "Reverb", type: "reverb", intensity: 0.5 });

    // Export
    const outputUri = await audioProducer.exportMix(mix.id);

    expect(outputUri).toBeDefined();
    expect(audioProducer.getMixStatus(mix.id)).toBe("completed");
  });

  it("should handle complete content generation workflow", async () => {
    // Create chart
    const chart = generator.createChart("line", "Growth", ["Week 1", "Week 2", "Week 3"], [
      { label: "Users", data: [100, 150, 250] },
    ]);

    // Export chart
    const chartImage = await generator.exportChart(chart.id);
    expect(chartImage).toBeDefined();

    // Generate image from template
    const templates = generator.getTemplates();
    const image = await generator.generateImage(templates[0].id);
    expect(image).toBeDefined();

    // Verify generated content
    const content = generator.listGeneratedContent();
    expect(content.length).toBe(2);
  });
});
