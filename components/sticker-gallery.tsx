/**
 * Sticker Gallery Component
 * Displays visual thumbnail previews of stickers
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface StickerThumbnail {
  id: string;
  emoji: string;
  name: string;
}

export interface StickerGalleryProps {
  title: string;
  description?: string;
  stickers: StickerThumbnail[];
  columns?: number;
}

/**
 * Sample stickers for each tier
 * These are placeholder emojis - can be replaced with actual sticker images
 */
export const STICKER_SAMPLES = {
  basic: [
    { id: 's1', emoji: '😊', name: 'Happy' },
    { id: 's2', emoji: '👍', name: 'Thumbs Up' },
    { id: 's3', emoji: '❤️', name: 'Love' },
    { id: 's4', emoji: '🎉', name: 'Party' },
  ],
  better: [
    { id: 's5', emoji: '🚀', name: 'Rocket' },
    { id: 's6', emoji: '⭐', name: 'Star' },
    { id: 's7', emoji: '🔥', name: 'Fire' },
    { id: 's8', emoji: '💪', name: 'Strong' },
  ],
  highQuality: [
    { id: 's9', emoji: '🌟', name: 'Sparkle' },
    { id: 's10', emoji: '🎨', name: 'Art' },
    { id: 's11', emoji: '🏆', name: 'Trophy' },
    { id: 's12', emoji: '✨', name: 'Shine' },
  ],
  premium: [
    { id: 's13', emoji: '👑', name: 'Crown' },
    { id: 's14', emoji: '💎', name: 'Diamond' },
    { id: 's15', emoji: '🌈', name: 'Rainbow' },
    { id: 's16', emoji: '🦄', name: 'Unicorn' },
  ],
  topNotch: [
    { id: 's17', emoji: '🎭', name: 'Drama' },
    { id: 's18', emoji: '🎪', name: 'Circus' },
    { id: 's19', emoji: '🎬', name: 'Movie' },
    { id: 's20', emoji: '🎸', name: 'Music' },
  ],
  ultraPremium: [
    { id: 's21', emoji: '🌌', name: 'Galaxy' },
    { id: 's22', emoji: '🚁', name: 'Helicopter' },
    { id: 's23', emoji: '🏰', name: 'Castle' },
    { id: 's24', emoji: '🌺', name: 'Flower' },
  ],
};

export function StickerGallery({
  title,
  description,
  stickers,
  columns = 4,
}: StickerGalleryProps) {
  const colors = useColors();

  return (
    <View className="gap-3">
      <View>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {description}
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {stickers.map((sticker) => (
          <View
            key={sticker.id}
            style={{
              width: `${100 / columns - 2}%`,
              aspectRatio: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 32 }}>{sticker.emoji}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default StickerGallery;
