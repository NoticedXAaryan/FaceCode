import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/constants/theme';

const privacy = `FaceTag stores an account with Clerk and a public profile in our database.

When you enroll, the server turns a camera frame into a numeric face signature. The raw photo is not kept. The signature is used only to match a later scan to your profile.

Scans, profile views, and link opens can be counted so you can see activity. You can make your profile private, delete the signature, export your profile data, or delete the account from Settings.

The built-in matcher is a lightweight signature. If the operator configures a remote face model, that service receives the frame needed to create the signature.`;

const terms = `FaceTag lets people share the links they choose by scanning a face they enrolled. Only enroll your own face. Do not scan someone in a way that violates their privacy or the law where you are.

Profiles you mark private are not returned as scan matches. You are responsible for the links you publish. The service can remove accounts that abuse scanning or impersonate someone else.

The app is provided as-is. Matching can be wrong, especially in poor light or when two people look alike. Treat a match as a hint and confirm before you rely on it.`;

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc !== 'terms';

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.title}>{isPrivacy ? 'Privacy' : 'Terms'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.body}>{isPrivacy ? privacy : terms}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 17 },
  content: { padding: 20, paddingBottom: 40 },
  body: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
});
