import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadConfig, saveConfig } from './src/storage';
import { addSample, dbToFraction, emptyStats, formatDb, zoneOf, type TagStats } from './src/levels';
import { useMeter } from './src/useMeter';

const PRESETS = ['Drums', 'Vocals', 'Bass', 'Guitar', 'Keys'];
const ZONE_COLOR = { safe: '#4cc38a', warm: '#f0b429', hot: '#ff6b6b' } as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <Monitor />
    </SafeAreaProvider>
  );
}

function Monitor() {
  const [tags, setTags] = useState<Record<string, TagStats>>({});
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadConfig().then((c) => {
      if (c) {
        setTags(Object.fromEntries(c.tags.map((n) => [n, emptyStats()])));
        setActive(c.active && c.tags.includes(c.active) ? c.active : null);
      }
      setLoaded(true);
    });
  }, []);

  const tagNames = Object.keys(tags).join('\n');
  useEffect(() => {
    if (loaded) saveConfig({ tags: tagNames ? tagNames.split('\n') : [], active });
  }, [loaded, tagNames, active]);

  const onLevel = useCallback(
    (db: number) => {
      if (!active) return;
      setTags((t) => ({ ...t, [active]: addSample(t[active] ?? emptyStats(), db) }));
    },
    [active],
  );
  const meter = useMeter(onLevel);

  // Keep the screen on while metering so the phone doesn't sleep mid-rehearsal.
  useEffect(() => {
    if (!meter.listening) return;
    activateKeepAwakeAsync('leveller');
    return () => {
      deactivateKeepAwake('leveller');
    };
  }, [meter.listening]);

  const addTag = (preset?: string) => {
    const name = (preset ?? draft).trim();
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
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View>
          <Text style={styles.title}>
            Level<Text style={styles.titleAccent}>ler</Text>
          </Text>
          <Text style={styles.tagline}>Tag it. Listen. See the levels.</Text>
        </View>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => addTag()}
            placeholder="New tag (e.g. drums)"
            placeholderTextColor="#778"
          />
          <Pressable style={styles.btn} onPress={() => addTag()}>
            <Text style={styles.btnText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.wrap}>
          {PRESETS.filter((p) => !(p in tags)).map((p) => (
            <Pressable key={p} style={styles.chip} onPress={() => addTag(p)}>
              <Text style={styles.chipText}>+ {p}</Text>
            </Pressable>
          ))}
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

        {Object.entries(tags).map(([name, s]) => {
          const isActive = active === name;
          const live = isActive && meter.listening;
          const color = ZONE_COLOR[zoneOf(s.current)];
          return (
            <Pressable
              key={name}
              onPress={() => setActive(name)}
              style={[styles.card, isActive && styles.cardOn]}
              accessibilityLabel={`${name}, current ${formatDb(s.current, s.samples)}, max ${formatDb(s.max, s.samples)}, average ${formatDb(s.avg, s.samples)}`}
            >
              <View style={styles.cardHead}>
                <View style={styles.row}>
                  {live && <View style={styles.dot} />}
                  <Text style={styles.tag}>{name}</Text>
                  {s.clipped && (
                    <View style={styles.clip}>
                      <Text style={styles.clipText}>CLIP</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.hero, s.samples > 0 && { color }]}>
                {s.samples === 0 ? '—' : s.current.toFixed(1)}
                <Text style={styles.heroUnit}> dB</Text>
              </Text>
              <View style={styles.bar}>
                <View
                  style={[styles.fill, { width: `${dbToFraction(s.current) * 100}%`, backgroundColor: color }]}
                />
                {s.samples > 0 && <View style={[styles.mark, { left: `${dbToFraction(s.hold) * 100}%` }]} />}
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
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101218' },
  content: { padding: 16, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 },
  titleAccent: { color: '#4cc38a' },
  tagline: { color: '#99a', marginTop: 2 },
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
  hero: { color: '#778', fontSize: 56, fontWeight: '700' },
  heroUnit: { fontSize: 20, fontWeight: '500', color: '#99a' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff6b6b' },
  clip: { backgroundColor: '#ff6b6b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  clipText: { color: '#101218', fontSize: 11, fontWeight: '800' },
  bar: { height: 18, backgroundColor: '#2a2e3b', borderRadius: 9, overflow: 'hidden' },
  fill: { height: '100%' },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#ff6b6b' },
  stat: { color: '#bbc', fontVariant: ['tabular-nums'] },
  link: { color: '#7aa2ff' },
});
