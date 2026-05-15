import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from '@/components/UI/Button';
import Avatar from '@/components/UI/Avatar';

export default function AvatarUpload({ uri, onChange }: { uri?: string; onChange: (uri: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled) onChange(result.assets[0].uri);
    setBusy(false);
  };
  return <View style={s.wrap}><Avatar size={72} uri={uri} initials="FT" showRing ringColor="gradient" /><Button title="Change photo" onPress={pick} variant="outline" loading={busy} /></View>;
}
const s = StyleSheet.create({ wrap: { gap: 12, alignItems: 'center' } });
