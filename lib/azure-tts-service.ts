/**
 * Azure Text-to-Speech Service
 * 
 * Integrates with Azure Cognitive Services for high-quality voice synthesis.
 * Free tier: 5,000 requests/month
 * 
 * Fallback: Uses Web Speech API (free, works everywhere)
 */

interface AzureTTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
}

class AzureTTSService {
  private apiKey: string | null = null;
  private region: string | null = null;
  private endpoint: string | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Load from environment variables
    this.apiKey = process.env.AZURE_TTS_KEY || null;
    this.region = process.env.AZURE_TTS_REGION || null;

    if (this.region) {
      this.endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    }

    // Initialize audio context if in browser
    if (typeof window !== "undefined" && typeof AudioContext !== "undefined") {
      try {
        this.audioContext = new (window as any).AudioContext() ||
          new (window as any).webkitAudioContext();
      } catch (err) {
        console.warn("Could not initialize AudioContext:", err);
      }
    }
  }

  /**
   * Synthesize text to speech
   * Tries Azure first, falls back to Web Speech API
   */
  async synthesizeToSpeech(
    text: string,
    options: AzureTTSOptions = {}
  ): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Try Azure if configured
    if (this.apiKey && this.endpoint) {
      try {
        await this.synthesizeWithAzure(text, options);
        return;
      } catch (error) {
        console.warn("Azure TTS failed, falling back to Web Speech API", error);
      }
    }

    // Fallback to Web Speech API (always works in browsers)
    try {
      this.synthesizeWithWebSpeechAPI(text, options);
    } catch (error) {
      console.error("Web Speech API failed:", error);
      throw new Error("Speech synthesis not available");
    }
  }

  /**
   * Synthesize using Azure Cognitive Services
   */
  private async synthesizeWithAzure(
    text: string,
    options: AzureTTSOptions
  ): Promise<void> {
    if (!this.apiKey || !this.endpoint) {
      throw new Error("Azure TTS not configured");
    }

    const voice = options.voice || "en-US-AriaNeural";
    const rate = options.rate || 1;
    const pitch = options.pitch || 1;

    // Build SSML (Speech Synthesis Markup Language)
    const ssml = `<speak version='1.0' xml:lang='en-US'>
      <voice name='${voice}'>
        <prosody rate='${rate}' pitch='${pitch}'>
          ${this.escapeXml(text)}
        </prosody>
      </voice>
    </speak>`;

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        },
        body: ssml,
      });

      if (!response.ok) {
        throw new Error(`Azure TTS error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      await this.playAudio(audioBuffer);
    } catch (error) {
      console.error("Azure TTS synthesis failed:", error);
      throw error;
    }
  }

  /**
   * Synthesize using Web Speech API (free, works everywhere)
   */
  private synthesizeWithWebSpeechAPI(
    text: string,
    options: AzureTTSOptions
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      throw new Error("Speech synthesis not supported in this environment");
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(2, options.rate || 1));
      utterance.pitch = Math.max(0.5, Math.min(2, options.pitch || 1));
      utterance.volume = 1;

      // Try to select a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Prefer female voices for friendliness
        const femaleVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes("female") ||
            v.name.includes("Aria") ||
            v.name.includes("Zira") ||
            v.name.includes("Nova") ||
            v.name.includes("Amber")
        );

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        } else if (voices.length > 0) {
          utterance.voice = voices[0];
        }
      }

      // Handle errors
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Web Speech API error:", error);
      throw error;
    }
  }

  /**
   * Play audio from ArrayBuffer
   */
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.audioContext) {
          this.audioContext = new (window as any).AudioContext() ||
            new (window as any).webkitAudioContext();
        }

        if (!this.audioContext) {
          throw new Error("AudioContext not initialized");
        }

        const source = this.audioContext.createBufferSource();
        
        this.audioContext.decodeAudioData(
          audioBuffer,
          (buffer: AudioBuffer) => {
            try {
              source.buffer = buffer;
              source.connect(this.audioContext!.destination);
              source.start(0);
              
              // Resolve when playback ends
              source.onended = () => {
                resolve();
              };
            } catch (error) {
              reject(error);
            }
          },
          (error: Error) => {
            console.error("Error decoding audio:", error);
            reject(error);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): string[] {
    return [
      "en-US-AriaNeural",
      "en-US-GuyNeural",
      "en-US-JennyNeural",
      "en-US-AmberNeural",
      "en-US-AshleyNeural",
      "en-US-CoraNeural",
    ];
  }

  /**
   * Check if Azure is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.region;
  }

  /**
   * Get synthesis status
   */
  getStatus(): string {
    if (this.isConfigured()) {
      return "Azure TTS configured";
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      return "Web Speech API available (fallback)";
    }
    return "Speech synthesis not available";
  }
}

// Export singleton instance
export const azureTTSService = new AzureTTSService();

/**
 * Helper function to speak text
 */
export async function speakText(
  text: string,
  voice?: string
): Promise<void> {
  try {
    await azureTTSService.synthesizeToSpeech(text, { voice });
  } catch (error) {
    console.error("Failed to speak text:", error);
    throw error;
  }
}

/**
 * Get speech synthesis status
 */
export function getSpeechStatus(): string {
  return azureTTSService.getStatus();
}
