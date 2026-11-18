import { useState } from 'react';
import { Image, Pressable, View, type GestureResponderEvent } from 'react-native';

import { poseFromTaps } from '@/domain/fit/movenet';
import type { BodyPose, Pt } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import type { TKey } from '@/i18n';
import { Button, Row, T } from '@/ui/components';
import { radius } from '@/ui/theme';

const STEPS: TKey[] = ['mark.shoulder1', 'mark.shoulder2', 'mark.hip1', 'mark.hip2', 'mark.foot1', 'mark.foot2'];

/** When the phone can't find her in the photo (or she wants to fix it): 6 taps on the photo. */
export function MarkBody({ uri, aspect, width, onDone, onCancel }: { uri: string; aspect?: number; width: number; onDone: (pose: BodyPose) => void; onCancel: () => void }) {
  const { t } = useApp();
  const [taps, setTaps] = useState<Pt[]>([]);
  const a = aspect && aspect > 0 ? aspect : 0.75;
  const h = width / a;
  const step = Math.min(taps.length, STEPS.length - 1);

  const tap = (e: GestureResponderEvent) => {
    if (taps.length >= STEPS.length) return;
    const { locationX, locationY } = e.nativeEvent;
    setTaps([...taps, { x: Math.min(1, Math.max(0, locationX / width)), y: Math.min(1, Math.max(0, locationY / h)) }]);
  };
  const pose = poseFromTaps(taps);

  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <T variant="heading" center>
        {pose ? t('mark.done') : t(STEPS[step])}
      </T>
      <T variant="small" muted center>
        {t('mark.progress', { n: Math.min(taps.length + 1, STEPS.length), total: STEPS.length })}
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel={pose ? t('mark.done') : t(STEPS[step])} onPress={tap} style={{ width, height: h, borderRadius: radius.md, overflow: 'hidden' }}>
        <Image source={{ uri }} style={{ width, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors importantForAccessibility="no" accessibilityElementsHidden />
        {taps.map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', left: p.x * width - 9, top: p.y * h - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#8B5CD6', borderWidth: 3, borderColor: '#FFFFFF' }}
          />
        ))}
      </Pressable>
      <Row wrap style={{ justifyContent: 'center' }}>
        {taps.length > 0 && <Button kind="secondary" label={t('mark.undo')} onPress={() => setTaps(taps.slice(0, -1))} />}
        <Button kind="secondary" label={t('common.cancel')} onPress={onCancel} />
        {pose && <Button label={t('common.done')} onPress={() => onDone(pose)} />}
      </Row>
    </View>
  );
}
