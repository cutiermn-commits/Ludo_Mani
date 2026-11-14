import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UI } from './theme';

// Keep this text identical to PRIVACY.md (the hosted version linked from App Store Connect).
// App Store Review Guideline 5.1.1(i) requires the policy both in App Store Connect and inside the app.
export const PRIVACY_TEXT = `Privacy Policy

Effective date: 14 November 2026

This app ("Ludo") is a board game you can play on one device or online with friends.

Accounts and personal data: The app has no accounts and never asks for your name, email, contacts, location or any other personal information. It contains no advertising, analytics or third-party tracking SDKs.

Playing on one device: Nothing leaves your device. Your chosen player nickname and any unfinished game are saved on your device so you can resume later; a saved game is deleted when it ends or you discard it.

Playing online: When you create or join an online room, the app connects to our game server and exchanges only what is needed to run the game: the room code, your colour, your nickname, your dice rolls and moves, and random session tokens that let you rejoin after a dropped connection. Nicknames are picked from a built-in list of fun names (such as "Lucky Llama"); you cannot type your own, and there is no chat or messaging. Game data is kept in the server's memory only while the room is active and is deleted a few minutes after the game ends, or after about 30 minutes without activity. Our server does not log IP addresses. Like any internet service, our hosting provider may process your IP address to deliver network traffic.

Children: The app does not knowingly collect personal information from anyone, including children.

Changes: If this policy changes, the updated version will be published in the app and at the URL listed on the App Store.

Contact: cutiermn@gmail.com`;

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
