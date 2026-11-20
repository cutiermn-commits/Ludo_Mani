import { Image, View } from 'react-native';

import { placeGarments, poseToPixels } from '@/domain/fit/place';
import type { BodyPose, ClothingItem } from '@/domain/types';

import { GarmentLayer } from './GarmentLayer';
import { radius } from '@/ui/theme';

/**
 * Her own photo wearing the clothes she picked (D-063, D-065): each garment cut-out is laid on
 * the photo where her shoulders, hips and feet are, by the same rules as on the avatar.
 * It is a flat overlay, not a simulation of how the fabric falls.
 */
export function TryOnPhoto({
  uri,
  aspect,
  pose,
  outfit = [],
  width,
  label,
  showPoints,
}: {
  uri: string;
  aspect?: number;
  pose?: BodyPose;
  outfit?: ClothingItem[];
  width: number;
  label: string;
  showPoints?: boolean;
}) {
  const a = aspect && aspect > 0 ? aspect : 0.75;
  const h = width / a;
  const px = pose ? poseToPixels(pose, width, h) : undefined;
  const garments = px ? placeGarments(outfit, px) : [];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width, height: h, borderRadius: radius.md, overflow: 'hidden' }}>
      <Image source={{ uri }} style={{ width, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors importantForAccessibility="no" accessibilityElementsHidden />
      <GarmentLayer garments={garments} />
      {showPoints &&
        px &&
        [px.lShoulder, px.rShoulder, px.lHip, px.rHip, px.lAnkle, px.rAnkle].map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', left: p.x - 7, top: p.y - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: '#8B5CD6', borderWidth: 2, borderColor: '#FFFFFF' }}
          />
        ))}
    </View>
  );
}
