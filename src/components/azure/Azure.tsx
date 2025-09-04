import { useState, useRef } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

/**
 * Unscripted(자유 발화) 평가 버전
 * - referenceText 없이 발화 품질(Accuracy/Fluency/Prosody)을 평가
 * - 연속 인식 중 나온 최종 결과들을 버퍼에 모아두고, 정지 시점에 1개만 확정/평가
 */

export default function AzureSpeech() {
  const [log, setLog] = useState("");
  const [listening, setListening] = useState(false);

  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);

  // 연속 인식 동안 나온 "완성된(utterance)" 결과를 모아둘 버퍼
  const resultsRef = useRef<sdk.SpeechRecognitionResult[]>([]);

  const append = (s: string) => setLog((p) => p + s + "\n");

  /** 마이크 권한 요청 */
  async function ensureMicPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      alert("마이크 권한을 허용해주세요.");
      return false;
    }
  }

  /**
   * 마이크 인식 시작(연속 인식 + Unscripted 평가)
   *
   * 순서:
   * 1) 권한 확인
   * 2) SpeechConfig/AudioConfig 구성
   * 3) PronunciationAssessmentConfig( referenceText 없음) 생성/적용
   * 4) startContinuousRecognitionAsync 호출
   * 5) recognized 이벤트에서 결과를 버퍼에만 적재
   */
  async function startMic() {
    const ok = await ensureMicPermission();
    if (!ok) return;

    setLog("");
    resultsRef.current = [];

    try {
      const key = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined;
      const region = import.meta.env.VITE_AZURE_SPEECH_REGION as
        | string
        | undefined;
      if (!key || !region)
        throw new Error("VITE_AZURE_SPEECH_KEY/REGION 환경변수를 확인하세요.");

      // 1) SpeechConfig 객체 생성
      const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
      // Prosody 지원 locale(예: en-US)
      speechConfig.speechRecognitionLanguage = "en-US";

      // 연속 인식 분절 제어(환경에 맞게 조정)
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "15000"
      );
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        "15000"
      );

      // 2) 오디오 입력(기본 마이크)
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // 3) Unscripted 평가 설정
      //    - referenceText를 빈 문자열("")로 전달 → speaking(자유 발화) 시나리오
      //    - miscue(삽입/누락)는 비교 대상 문장이 없으므로 false
      //    - granularity는 음소 단위(정밀 평가)
      const pa = new sdk.PronunciationAssessmentConfig(
        "", //  Unscripted: reference 없음
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        false //  Unscripted에서는 miscue 의미가 없으므로 비활성화
      );
      // Prosody(운율) 평가 활성화(JS SDK 버전에 따라 메서드/플래그가 다를 수 있음)
      (pa as any).enableProsodyAssessment?.();
      (pa as any).enableProsodyAssessment = true;

      // 4) 인식기 생성 및 평가 적용
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;
      pa.applyTo(recognizer); // ← 이 시점부터 Unscripted 평가 동작

      // 이벤트 바인딩
      recognizer.sessionStarted = (_s, e) =>
        append(`Session started: ${e.sessionId}`);

      // 최종(utterance) 결과를 버퍼에 적재(즉시 화면 반영하지 않음)
      recognizer.recognized = (_s, e) => {
        if (
          e.result.reason === sdk.ResultReason.RecognizedSpeech &&
          e.result.text
        ) {
          resultsRef.current.push(e.result);
        }
      };

      recognizer.canceled = (_s, e) =>
        append(`Canceled: ${e.errorDetails || e.reason}`);

      // 연속 인식 시작
      recognizer.startContinuousRecognitionAsync(
        () => {
          setListening(true);
          append("Continuous recognition started. 자유롭게 말하세요...");
        },
        (err) => {
          append(`Start error: ${err}`);
          recognizer.close();
          recognizerRef.current = null;
        }
      );
    } catch (e: any) {
      append(`Error: ${e?.message ?? String(e)}`);
    }
  }

  /**
   * 버퍼에서 최종 결과 1개를 선택 후, Unscripted 평가 결과(Accuracy/Fluency/Prosody)만 출력
   */
  function processBufferedResults() {
    const candidates = resultsRef.current.filter(
      (r) => r.reason === sdk.ResultReason.RecognizedSpeech && r.text
    );
    if (candidates.length === 0) {
      append("No speech captured.");
      return;
    }

    // 정책: 텍스트가 가장 긴 결과를 최종으로 채택(필요하면 다른 정책으로 교체 가능)
    const finalRes = candidates.reduce((a, b) =>
      b.text.length >= a.text.length ? b : a
    );

    append(`\n=== FINAL (Unscripted) ===\nText: ${finalRes.text}`);

    // 평가 결과 추출(Unscripted 핵심 지표: Accuracy / Fluency / Prosody)
    const paResult = sdk.PronunciationAssessmentResult.fromResult(finalRes);

    const accuracy = paResult.accuracyScore ?? "N/A";
    const fluency = paResult.fluencyScore ?? "N/A";
    const prosody = (paResult as any).prosodyScore ?? "N/A";

    append(`Accuracy=${accuracy} | Fluency=${fluency} | Prosody=${prosody}`);

    // 단어 레벨 상세(필요 시 표시). Unscripted에서도 단어 정확도는 반환될 수 있음.
    (paResult.detailResult?.Words ?? []).forEach((w: any, idx: number) => {
      append(
        `${idx + 1}. ${w.Word}  acc=${
          w.PronunciationAssessment?.AccuracyScore ?? "N/A"
        }`
      );
    });

    resultsRef.current = []; // 다음 라운드를 위해 비우기
  }

  /** 마이크 인식 정지(정지 시점에만 최종 결과 확정/평가) */
  function stopMic() {
    const r = recognizerRef.current;
    if (!r) return;

    r.stopContinuousRecognitionAsync(
      () => {
        append("Recognition stopped by user.");
        processBufferedResults(); // 정지 시 1회만 확정/평가
        r.close();
        recognizerRef.current = null;
        setListening(false);
      },
      (err) => append(`Stop error: ${err}`)
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Azure Speech Pronunciation Assessment — Unscripted (Speaking)</h2>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        모드: <strong>Unscripted(자유 발화)</strong> — 임의로 말한 내용을
        평가합니다.
      </div>

      <div style={{ marginTop: 8 }}>
        {!listening ? (
          <button onClick={startMic} style={{ border: "1px solid black" }}>
            마이크 시작
          </button>
        ) : (
          <button onClick={stopMic} style={{ border: "1px solid black" }}>
            마이크 정지
          </button>
        )}
      </div>

      <pre
        style={{
          background: "#111",
          color: "#a0f0a0",
          padding: 12,
          marginTop: 12,
          height: 300,
          overflow: "auto",
        }}
      >
        {log}
      </pre>
    </div>
  );
}
