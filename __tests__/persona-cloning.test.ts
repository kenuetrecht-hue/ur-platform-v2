import { describe, it, expect, beforeEach } from 'vitest';
import { PersonaCloningService, ClonedPersona } from '../lib/persona-cloning';

describe('Persona Cloning Service', () => {
  let service: PersonaCloningService;
  let personaId: string;
  const creatorId = 'creator_123';

  beforeEach(() => {
    service = new PersonaCloningService();
  });

  describe('Persona Initialization', () => {
    it('should initialize a new persona', () => {
      const persona = service.initializePersona(creatorId);
      
      expect(persona).toBeDefined();
      expect(persona.creatorId).toBe(creatorId);
      expect(persona.accuracy).toBe(0);
      expect(persona.isActive).toBe(false);
      expect(persona.voiceProfile.trainingProgress).toBe(0);
      
      personaId = persona.personaId;
    });

    it('should create unique persona IDs', async () => {
      const persona1 = service.initializePersona(creatorId);
      await new Promise(resolve => setTimeout(resolve, 10));
      const persona2 = service.initializePersona(creatorId);
      
      expect(persona1.personaId).not.toBe(persona2.personaId);
    });
  });

  describe('Voice Training', () => {
    beforeEach(() => {
      const persona = service.initializePersona(creatorId);
      personaId = persona.personaId;
    });

    it('should record voice samples', () => {
      const voiceProfile = service.recordVoiceSample(
        personaId,
        'https://example.com/audio1.mp3',
        3600 // 1 hour
      );

      expect(voiceProfile.recordedSamples).toHaveLength(1);
      expect(voiceProfile.trainingProgress).toBeGreaterThan(0);
    });

    it('should accumulate training hours', () => {
      service.recordVoiceSample(personaId, 'https://example.com/audio1.mp3', 3600);
      service.recordVoiceSample(personaId, 'https://example.com/audio2.mp3', 3600);
      
      const persona = service.getPersona(personaId);
      expect(persona?.trainingHours).toBe(2);
    });

    it('should set voice characteristics', () => {
      const voiceProfile = service.setVoiceCharacteristics(
        personaId,
        1.2,
        1.1,
        'humorous',
        75
      );

      expect(voiceProfile.pitch).toBe(1.2);
      expect(voiceProfile.speed).toBe(1.1);
      expect(voiceProfile.tone).toBe('humorous');
      expect(voiceProfile.emotionalRange).toBe(75);
    });

    it('should clamp voice characteristics to valid ranges', () => {
      const voiceProfile = service.setVoiceCharacteristics(
        personaId,
        3.0, // Should clamp to 2.0
        0.2, // Should clamp to 0.5
        'professional',
        150 // Should clamp to 100
      );

      expect(voiceProfile.pitch).toBe(2.0);
      expect(voiceProfile.speed).toBe(0.5);
      expect(voiceProfile.emotionalRange).toBe(100);
    });
  });

  describe('Personality Training', () => {
    beforeEach(() => {
      const persona = service.initializePersona(creatorId);
      personaId = persona.personaId;
    });

    it('should add training examples', () => {
      service.addTrainingExample(
        personaId,
        'How to fix a leaky faucet',
        'Well, first you want to turn off the water supply...',
        'tutorial',
        'educational'
      );

      const persona = service.getPersona(personaId);
      expect(persona?.personalityProfile.trainingExamples).toHaveLength(1);
    });

    it('should extract catchphrases from training examples', () => {
      service.addTrainingExample(
        personaId,
        'Q1',
        'You know, the best way to do this is to start with the basics',
        'context1',
        'friendly'
      );
      service.addTrainingExample(
        personaId,
        'Q2',
        'You know, the best way to approach this problem is systematically',
        'context2',
        'friendly'
      );

      const persona = service.getPersona(personaId);
      expect(persona?.personalityProfile.catchphrases.length).toBeGreaterThan(0);
    });

    it('should track emotional tone', () => {
      service.addTrainingExample(
        personaId,
        'Q1',
        'That is hilarious! 😄',
        'context1',
        'humorous'
      );
      service.addTrainingExample(
        personaId,
        'Q2',
        'That is funny! 😂',
        'context2',
        'humorous'
      );

      const persona = service.getPersona(personaId);
      expect(persona?.personalityProfile.emotionalTone).toBe('humorous');
    });
  });

  describe('Persona Activation', () => {
    beforeEach(() => {
      const persona = service.initializePersona(creatorId);
      personaId = persona.personaId;
    });

    it('should require sufficient accuracy to activate', () => {
      expect(() => {
        service.activatePersona(personaId);
      }).toThrow('Persona accuracy too low');
    });

    it('should activate persona after sufficient training', () => {
      // Add enough training to reach 60% accuracy
      for (let i = 0; i < 12; i++) {
        service.addTrainingExample(
          personaId,
          `Q${i}`,
          `Response ${i}`,
          'context',
          'friendly'
        );
      }

      const activated = service.activatePersona(personaId);
      expect(activated.isActive).toBe(true);
    });
  });

  describe('Persona Response Generation', () => {
    beforeEach(() => {
      const persona = service.initializePersona(creatorId);
      personaId = persona.personaId;

      // Add training data
      for (let i = 0; i < 12; i++) {
        service.addTrainingExample(
          personaId,
          `Q${i}`,
          `Response ${i}`,
          'context',
          'friendly'
        );
      }

      service.activatePersona(personaId);
    });

    it('should generate persona response', async () => {
      const response = await service.generatePersonaResponse(
        personaId,
        'What is your favorite tool?'
      );

      expect(response.content).toBeDefined();
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.emotionalTone).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should reject response generation for inactive persona', async () => {
      const newPersona = service.initializePersona(creatorId);
      
      await expect(
        service.generatePersonaResponse(newPersona.personaId, 'test')
      ).rejects.toThrow('Persona is not active');
    });
  });

  describe('Persona Management', () => {
    let managementPersonaId: string;

    beforeEach(() => {
      const persona = service.initializePersona(creatorId);
      managementPersonaId = persona.personaId;
    });

    it('should retrieve persona', () => {
      const persona = service.getPersona(managementPersonaId);
      expect(persona?.personaId).toBe(managementPersonaId);
    });

    it('should get all creator personas', () => {
      // Initialize additional personas for this creator
      const persona2 = service.initializePersona(creatorId);
      const persona3 = service.initializePersona(creatorId);

      const personas = service.getCreatorPersonas(creatorId);
      // All returned personas should belong to the same creator
      expect(personas.length).toBeGreaterThan(0);
      expect(personas.every(p => p.creatorId === creatorId)).toBe(true);
      // Verify we can find the personas we just created
      expect(personas.some(p => p.personaId === persona2.personaId)).toBe(true);
      expect(personas.some(p => p.personaId === persona3.personaId)).toBe(true);
    });

    it('should update persona', () => {
      const updated = service.updatePersona(managementPersonaId, {
        accuracy: 85,
      });

      expect(updated.accuracy).toBe(85);
    });

    it('should delete persona', () => {
      // First verify the persona exists
      let retrieved = service.getPersona(managementPersonaId);
      expect(retrieved).toBeDefined();

      // Delete it
      const deleted = service.deletePersona(managementPersonaId);
      expect(deleted).toBe(true);

      // Verify it's gone
      retrieved = service.getPersona(managementPersonaId);
      expect(retrieved).toBeUndefined();
    });

    it('should get training progress', () => {
      // Use a fresh persona for this test to avoid state from other tests
      const testPersona = service.initializePersona(creatorId + '_progress');
      service.recordVoiceSample(testPersona.personaId, 'https://example.com/audio.mp3', 3600);
      
      const progress = service.getTrainingProgress(testPersona.personaId);
      expect(progress).toBeGreaterThan(0);
    });

    it('should get persona statistics', () => {
      // Use a fresh persona for this test to avoid state from other tests
      const testPersona = service.initializePersona(creatorId + '_stats');
      service.recordVoiceSample(testPersona.personaId, 'https://example.com/audio.mp3', 3600);
      service.addTrainingExample(
        testPersona.personaId,
        'Q1',
        'Response 1',
        'context',
        'friendly'
      );

      const stats = service.getPersonaStats(testPersona.personaId);
      expect(stats?.trainingHours).toBe(1);
      expect(stats?.trainingExamples).toBe(1);
      expect(stats?.voiceSamples).toBe(1);
    });
  });
});
