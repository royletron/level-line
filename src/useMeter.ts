import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingInput,
} from 'expo-audio';

const POLL_MS = 100;

// Captures from the selected input purely to read its level; nothing is played back.
export function useMeter(onLevel: (db: number) => void) {
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, POLL_MS);
  const [listening, setListening] = useState(false);
  const [inputs, setInputs] = useState<RecordingInput[]>([]);
  const [inputUid, setInputUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  useEffect(() => {
    if (listening && state.isRecording && state.metering !== undefined) {
      onLevelRef.current(state.metering);
    }
  }, [state, listening]);

  const start = useCallback(async () => {
    try {
      setError(null);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission denied');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setInputs(recorder.getAvailableInputs());
      setInputUid((await recorder.getCurrentInput()).uid);
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    setListening(false);
    try {
      await recorder.stop();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [recorder]);

  const selectInput = useCallback(
    (uid: string) => {
      try {
        recorder.setInput(uid);
        setInputUid(uid);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [recorder],
  );

  return { listening, start, stop, inputs, inputUid, selectInput, error };
}
