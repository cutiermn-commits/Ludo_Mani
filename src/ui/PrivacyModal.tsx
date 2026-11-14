import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UI } from './theme';

// Keep this text identical to PRIVACY.md (the hosted version linked from App Store Connect).
// App Store Review Guideline 5.1.1(i) requires the policy both in App Store Connect and inside the app.
export const PRIVACY_TEXT = `Privacy Policy

Effective date: [FILL IN BEFORE SUBMISSION]

This app ("Ludo") is an offline board game.

Data we collect: None. The app does not collect, store on a server, transmit, sell or share any personal data. It has no accounts, no analytics, no advertising and no third-party tracking SDKs.

Data on your device: Game settings exist only in memory while the app is open.

Children: The app does not knowingly collect any information from anyone, including children.

Changes: If this policy changes, the updated version will be published in the app and at the URL listed on the App Store.

Contact: [YOUR SUPPORT EMAIL]`;

export function PrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.text}>{PRIVACY_TEXT}</Text>
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: UI.bg, padding: 20 },
  content: { paddingBottom: 24 },
  text: { color: UI.text, fontSize: 15, lineHeight: 22 },
  close: { backgroundColor: UI.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  closeText: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
});
