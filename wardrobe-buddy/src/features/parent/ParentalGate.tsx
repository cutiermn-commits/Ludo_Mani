import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { Button, Card, T } from '@/ui/components';
import { radius, space, TAP } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

import { checkGateAnswer, GATE_COOLDOWN_MS, GATE_MAX_TRIES, makeGateQuestion } from './gate';

/** Renders the gate until passed; then calls onPass. Cannot be turned off. */
export function ParentalGate({ onPass }: { onPass: () => void }) {
  const { t } = useApp();
  const c = useTheme();
  const [q, setQ] = useState(() => makeGateQuestion());
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(0);
  const [locked, setLocked] = useState(false);

  const submit = () => {
    if (locked) return;
    if (checkGateAnswer(q, value)) return onPass();
    const tries = wrong + 1;
    setWrong(tries);
    setValue('');
    setQ(makeGateQuestion());
    if (tries % GATE_MAX_TRIES === 0) {
      setLocked(true);
      setTimeout(() => setLocked(false), GATE_COOLDOWN_MS);
    }
  };

  return (
    <Card>
      <T variant="heading">{t('gate.title')}</T>
      <T muted>{t('gate.body')}</T>
      <T variant="title" center>
        {t('gate.question', { a: q.a, b: q.b })}
      </T>
      <TextInput
        accessibilityLabel={t('gate.inputLabel')}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect={false}
        placeholder={t('gate.placeholder')}
        placeholderTextColor={c.textMuted}
        style={{
          minHeight: TAP + 4,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: c.border,
          color: c.text,
          backgroundColor: c.surface,
          fontSize: 22,
          paddingHorizontal: space.lg,
          textAlign: 'center',
        }}
      />
      {wrong > 0 && (
        <View accessibilityLiveRegion="polite">
          <T variant="small" muted>
            {locked ? t('gate.locked') : t('gate.wrong')}
          </T>
        </View>
      )}
      <Button label={t('gate.submit')} onPress={submit} disabled={value.trim() === '' || locked} />
    </Card>
  );
}
