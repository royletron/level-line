import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addSample, dbToFraction, emptyStats, formatDb, type TagStats } from './src/levels';
import { useMeter } from './src/useMeter';

export default function App() {
  const [tags, setTags] = useState<Record<string, TagStats>>({});
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const onLevel = useCallback(
    (db: number) => {
      if (!active) return;
      setTags((t) => ({ ...t, [active]: addSample(t[active] ?? emptyStats(), db) }));
    },
    [active],
  );
  const meter = useMeter(onLevel);

  const addTag = () => {
    const name = draft.trim();
    if (!name) return;
    setTags((t) => (name in t ? t : { ...t, [name]: emptyStats() }));
    setActive(name);
    setDraft('');
  };
  const resetTag = (name: string) => setTags((t) => ({ ...t, [name]: emptyStats() }));
  const removeTag = (name: string) => {
    setTags(({ [name]: _, ...rest }) => rest);
    if (active === name) setActive(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Level Monitor</Text>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addTag}
            placeholder="New tag (e.g. drums)"
            placeholderTextColor="#778"
          />
          <Pressable style={styles.btn} onPress={addTag}>
            <Text style={styles.btnText}>Add</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.listen, meter.listening && styles.listenOn]}
          onPress={meter.listening ? meter.stop : meter.start}
        >
          <Text style={styles.btnText}>
            {meter.listening ? `Stop listening${active ? ` (${active})` : ''}` : 'Start listening'}
          </Text>
        </Pressable>
        {meter.listening && !active && (
          <Text style={styles.hint}>Select a tag below to record its levels.</Text>
        )}
        {meter.error && <Text style={styles.error}>{meter.error}</Text>}

        {meter.inputs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Input</Text>
            <View style={styles.wrap}>
              {meter.inputs.map((i) => (
                <Pressable
                  key={i.uid}
                  onPress={() => meter.selectInput(i.uid)}
                  style={[styles.chip, meter.inputUid === i.uid && styles.chipOn]}
                >
                  <Text style={styles.chipText}>{i.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {Object.entries(tags).map(([name, s]) => (
          <Pressable
            key={name}
            onPress={() => setActive(name)}
            style={[styles.card, active === name && styles.cardOn]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.tag}>{name}</Text>
              <Text style={styles.now}>{formatDb(s.current, s.samples)}</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${dbToFraction(s.current) * 100}%` }]} />
              <View style={[styles.mark, { left: `${dbToFraction(s.max) * 100}%` }]} />
            </View>
            <View style={styles.cardHead}>
              <Text style={styles.stat}>Max {formatDb(s.max, s.samples)}</Text>
              <Text style={styles.stat}>Avg {formatDb(s.avg, s.samples)}</Text>
            </View>
            <View style={styles.row}>
              <Pressable onPress={() => resetTag(name)}>
                <Text style={styles.link}>Reset</Text>
              </Pressable>
              <Pressable onPress={() => removeTag(name)}>
                <Text style={styles.link}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101218' },
  content: { padding: 16, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 24 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: {
    flex: 1, color: '#fff', backgroundColor: '#1c1f2a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  btn: { backgroundColor: '#3b6cf6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  listen: { backgroundColor: '#2a8f5a', borderRadius: 8, padding: 14 },
  listenOn: { backgroundColor: '#c0392b' },
  hint: { color: '#e0b050' },
  error: { color: '#ff7b7b' },
  section: { gap: 6 },
  label: { color: '#99a', fontSize: 12, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1c1f2a', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#3b6cf6' },
  chipText: { color: '#fff' },
  card: { backgroundColor: '#1c1f2a', borderRadius: 12, padding: 14, gap: 8, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: '#3b6cf6' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between' },
  tag: { color: '#fff', fontSize: 18, fontWeight: '600' },
  now: { color: '#fff', fontSize: 18, fontVariant: ['tabular-nums'] },
  bar: { height: 14, backgroundColor: '#2a2e3b', borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#4cc38a' },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#ff6b6b' },
  stat: { color: '#bbc', fontVariant: ['tabular-nums'] },
  link: { color: '#7aa2ff' },
});
