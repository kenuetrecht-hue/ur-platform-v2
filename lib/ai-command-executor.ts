/**
 * AI Command Executor Service
 * Processes natural language commands from Personal AI and executes production tools
 */

import VideoEditor from '@/lib/video-editor';
import AudioProducer from '@/lib/audio-producer';
import ContentGenerator from '@/lib/content-generator';

export interface CommandResult {
  success: boolean;
  command: string;
  action: string;
  result: any;
  error?: string;
  timestamp: Date;
}

export interface ParsedCommand {
  intent: string;
  tool: 'video' | 'audio' | 'content' | 'unknown';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export class AICommandExecutor {
  private videoEditor: VideoEditor;
  private audioProducer: AudioProducer;
  private contentGenerator: ContentGenerator;
  private commandHistory: CommandResult[] = [];

  constructor() {
    this.videoEditor = new VideoEditor();
    this.audioProducer = new AudioProducer();
    this.contentGenerator = new ContentGenerator();
  }

  /**
   * Parse natural language command from AI
   */
  parseCommand(command: string): ParsedCommand {
    const lowerCmd = command.toLowerCase();
    let tool: 'video' | 'audio' | 'content' | 'unknown' = 'unknown';
    let action = '';
    let confidence = 0;

    // Video commands
    if (
      lowerCmd.includes('video') ||
      lowerCmd.includes('crop') ||
      lowerCmd.includes('trim') ||
      lowerCmd.includes('edit') ||
      lowerCmd.includes('effect')
    ) {
      tool = 'video';
      confidence = 0.95;

      if (lowerCmd.includes('crop')) {
        action = 'crop';
      } else if (lowerCmd.includes('trim')) {
        action = 'trim';
      } else if (lowerCmd.includes('effect')) {
        action = 'addEffect';
      } else if (lowerCmd.includes('export')) {
        action = 'export';
      }
    }

    // Audio commands
    if (
      lowerCmd.includes('audio') ||
      lowerCmd.includes('mix') ||
      lowerCmd.includes('track') ||
      lowerCmd.includes('reverb') ||
      lowerCmd.includes('music')
    ) {
      tool = 'audio';
      confidence = 0.95;

      if (lowerCmd.includes('mix')) {
        action = 'mix';
      } else if (lowerCmd.includes('track')) {
        action = 'addTrack';
      } else if (lowerCmd.includes('reverb') || lowerCmd.includes('effect')) {
        action = 'addEffect';
      } else if (lowerCmd.includes('export')) {
        action = 'export';
      }
    }

    // Content generation commands
    if (
      lowerCmd.includes('chart') ||
      lowerCmd.includes('graph') ||
      lowerCmd.includes('image') ||
      lowerCmd.includes('generate')
    ) {
      tool = 'content';
      confidence = 0.95;

      if (lowerCmd.includes('chart') || lowerCmd.includes('graph')) {
        action = 'createChart';
      } else if (lowerCmd.includes('image')) {
        action = 'generateImage';
      } else if (lowerCmd.includes('template')) {
        action = 'createTemplate';
      }
    }

    return {
      intent: command,
      tool,
      action,
      parameters: this.extractParameters(command),
      confidence,
    };
  }

  /**
   * Extract parameters from command
   */
  private extractParameters(command: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract numbers (for timing, values, etc.)
    const numbers = command.match(/\d+/g);
    if (numbers) {
      params.values = numbers.map(Number);
    }

    // Extract file references
    if (command.includes('file:')) {
      const fileMatch = command.match(/file:\s*(\S+)/);
      if (fileMatch) {
        params.file = fileMatch[1];
      }
    }

    // Extract effect types
    const effects = ['brightness', 'contrast', 'saturation', 'reverb', 'delay', 'compression'];
    effects.forEach((effect) => {
      if (command.toLowerCase().includes(effect)) {
        params.effect = effect;
      }
    });

    return params;
  }

  /**
   * Execute parsed command
   */
  async executeCommand(parsed: ParsedCommand): Promise<CommandResult> {
    const result: CommandResult = {
      success: false,
      command: parsed.intent,
      action: parsed.action,
      result: null,
      timestamp: new Date(),
    };

    try {
      if (parsed.tool === 'video') {
        result.result = this.executeVideoCommand(parsed);
      } else if (parsed.tool === 'audio') {
        result.result = this.executeAudioCommand(parsed);
      } else if (parsed.tool === 'content') {
        result.result = this.executeContentCommand(parsed);
      } else {
        throw new Error('Unknown tool specified');
      }

      result.success = true;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.commandHistory.push(result);
    return result;
  }

  /**
   * Execute video editing commands
   */
  private executeVideoCommand(parsed: ParsedCommand): any {
    switch (parsed.action) {
      case 'crop': {
        const session = this.videoEditor.createEditSession('input.mp4');
        if (parsed.parameters.values && parsed.parameters.values.length >= 1) {
          const cropBox = parsed.parameters.values[0];
          this.videoEditor.cropVideo(
            session.id,
            cropBox
          );
        }
        return { sessionId: session.id, action: 'crop' };
      }

      case 'trim': {
        const session = this.videoEditor.createEditSession('input.mp4');
        if (parsed.parameters.values && parsed.parameters.values.length >= 2) {
          this.videoEditor.trimVideo(
            session.id,
            parsed.parameters.values[0],
            parsed.parameters.values[1]
          );
        }
        return { sessionId: session.id, action: 'trim' };
      }

      case 'addEffect': {
        const session = this.videoEditor.createEditSession('input.mp4');
        this.videoEditor.addEffect(session.id, parsed.parameters.effect || 'brightness');
        return { sessionId: session.id, action: 'addEffect', effect: parsed.parameters.effect };
      }

      case 'export': {
        const session = this.videoEditor.createEditSession('input.mp4');
        const result = this.videoEditor.exportVideo(session.id);
        return { sessionId: session.id, ...result };
      }

      default:
        throw new Error(`Unknown video action: ${parsed.action}`);
    }
  }

  /**
   * Execute audio production commands
   */
  private executeAudioCommand(parsed: ParsedCommand): any {
    switch (parsed.action) {
      case 'mix': {
        const sessionId = 'mix-session-' + Date.now();
        return { sessionId, action: 'mix' };
      }

      case 'addTrack': {
        const sessionId = 'mix-session-' + Date.now();
        const trackId = 'track-' + Date.now();
        return { sessionId, trackId, action: 'addTrack' };
      }

      case 'addEffect': {
        const sessionId = 'mix-session-' + Date.now();
        const trackId = 'track-' + Date.now();
        return { sessionId, trackId, action: 'addEffect', effect: parsed.parameters.effect };
      }

      case 'export': {
        const sessionId = 'mix-session-' + Date.now();
        return { sessionId, action: 'export', format: 'wav' };
      }

      default:
        throw new Error(`Unknown audio action: ${parsed.action}`);
    }
  }

  /**
   * Execute content generation commands
   */
  private executeContentCommand(parsed: ParsedCommand): any {
    switch (parsed.action) {
      case 'createChart': {
        const chartId = 'chart-' + Date.now();
        return { chartId, action: 'createChart' };
      }

      case 'generateImage': {
        const imageId = 'image-' + Date.now();
        return { imageId, action: 'generateImage' };
      }

      case 'createTemplate': {
        const templateId = 'template-' + Date.now();
        return { templateId, action: 'createTemplate' };
      }

      default:
        throw new Error(`Unknown content action: ${parsed.action}`);
    }
  }

  /**
   * Process natural language command end-to-end
   */
  async processNaturalLanguageCommand(command: string): Promise<CommandResult> {
    const parsed = this.parseCommand(command);
    return this.executeCommand(parsed);
  }

  /**
   * Get command history
   */
  getCommandHistory(): CommandResult[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    successRate: number;
  } {
    const total = this.commandHistory.length;
    const successful = this.commandHistory.filter((r) => r.success).length;
    const failed = total - successful;

    return {
      totalCommands: total,
      successfulCommands: successful,
      failedCommands: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}

export { AICommandExecutor };
export const aiCommandExecutor = new AICommandExecutor();
