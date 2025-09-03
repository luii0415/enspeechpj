import { useEffect, useRef, useState } from "react";
import { Status } from "../../types/KlleonSDK";
import type { AvatarProps } from "../../types/KlleonSDK";
import echoMessagesData from "../../data/echoMessages.json";

const SDK_KEY = import.meta.env.VITE_API_KEY;
const AVATAR_ID = import.meta.env.VITE_API_Model;

export function Klleon() {
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [status, setStatus] = useState<Status>("IDLE");
  const [isSDKInitialized, setIsSDKInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // 에코 메시지 관련 상태
  const [echoMessages] = useState<string[]>(echoMessagesData);
  const [currentEchoIndex, setCurrentEchoIndex] = useState(0);

  const avatarRef = useRef<HTMLElement & AvatarProps>(null);

  // 컴포넌트 마운트 시 아바타 기본 설정 및 cleanup 등록
  useEffect(() => {
    if (avatarRef.current) {
      avatarRef.current.videoStyle = {
        borderRadius: "30px",
        objectFit: "cover",
      };
      avatarRef.current.volume = 100;
    }

    // 자동 세션 정리: 사용자가 페이지를 떠날 때 SDK 세션을 자동으로 종료하여 메모리 누수 방지
    return () => {
      if (isSDKInitialized) {
        const { KlleonChat } = window;
        try {
          KlleonChat.destroy?.();
          console.log("컴포넌트 언마운트: 세션 정리 완료");
        } catch (error) {
          console.error("컴포넌트 언마운트: 세션 정리 실패", error);
        }
      }
    };
  }, [isSDKInitialized]);

  // SDK 시작 함수
  const startSDK = async () => {
    if (isInitializing || isSDKInitialized) return;

    setIsInitializing(true);
    const { KlleonChat } = window;

    try {
      // 기존 이벤트 리스너 정리 (혹시 모를 중복 방지)
      KlleonChat.destroy?.();

      // 잠시 대기 (DOM이 완전히 준비되도록)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 1. Status 이벤트 리스너 등록
      KlleonChat.onStatusEvent((status) => {
        console.log("Status Event:", status);
        setStatus(status);
        if (status === "VIDEO_CAN_PLAY") {
          console.log("아바타 영상 재생 준비 완료!");
        }
      });

      // 2. Chat 이벤트 리스너 등록
      KlleonChat.onChatEvent((chatData) => {
        console.log("SDK Chat Event:", chatData);

        // 아바타 발화 상태 관리
        if (chatData.chat_type === "PREPARING_RESPONSE") {
          setIsAvatarSpeaking(true);
        }
        if (chatData.chat_type === "RESPONSE_IS_ENDED") {
          setIsAvatarSpeaking(false);
        }
      });

      // 3. SDK 초기화 전에 환경변수 확인
      if (!SDK_KEY || !AVATAR_ID) {
        throw new Error("API 키 또는 아바타 ID가 설정되지 않았습니다.");
      }

      console.log("SDK 초기화 시작...", {
        SDK_KEY: SDK_KEY?.substring(0, 10) + "...",
        AVATAR_ID,
        voice_code: "en_us",
        voice_tts_speech_speed: 0.8,
        enable_microphone: true,
        log_level: "debug",
      });

      // 4. SDK 초기화
      await KlleonChat.init({
        sdk_key: SDK_KEY,
        avatar_id: AVATAR_ID,
      });

      setIsSDKInitialized(true);
      console.log("SDK 초기화 완료");
    } catch (error) {
      console.error("SDK 초기화 실패:", error);
      setStatus("IDLE");
    } finally {
      setIsInitializing(false);
    }
  };

  // SDK 종료 함수
  const stopSDK = async () => {
    if (!isSDKInitialized) return;

    const { KlleonChat } = window;

    try {
      // 발화 중단
      KlleonChat.stopSpeech?.();

      // SDK 완전 종료
      KlleonChat.destroy?.();

      setIsSDKInitialized(false);
      setStatus("IDLE");
      setIsAvatarSpeaking(false);
      console.log("SDK 종료 완료");
    } catch (error) {
      console.error("SDK 종료 실패:", error);
    }
  };

  // 다음 대사 읽기 함수 (순환 없음)
  const playNextEcho = () => {
    const { KlleonChat } = window;

    if (!isSDKInitialized) {
      alert("먼저 사용을 시작해주세요.");
      return;
    }

    if (echoMessages.length > 0) {
      // 배열 범위를 벗어나면 더 이상 진행하지 않음
      if (currentEchoIndex >= echoMessages.length) {
        alert(
          "모든 대사를 읽었습니다. '처음부터' 버튼을 눌러서 다시 시작하세요."
        );
        return;
      }

      const messageToSpeak = echoMessages[currentEchoIndex];
      console.log("Speaking:", messageToSpeak);
      KlleonChat.echo(messageToSpeak);

      // 다음 인덱스로 이동 (순환 없음)
      setCurrentEchoIndex(currentEchoIndex + 1);
    }
  };

  const stopSpeech = () => {
    const { KlleonChat } = window;
    if (isSDKInitialized) {
      KlleonChat.stopSpeech();
    }
  };

  // 에코 인덱스 리셋 함수
  const resetEchoIndex = () => {
    setCurrentEchoIndex(0);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        height: "720px",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* 아바타 컨테이너 */}
        <avatar-container
          ref={avatarRef}
          style={{
            flex: 1,
            minHeight: "400px",
            border: isSDKInitialized ? "2px solid #28a745" : "2px solid #ddd",
          }}
          class=""
        ></avatar-container>

        {/* 컨트롤 패널 */}
        <div
          style={{
            background: "#f5f5f5",
            padding: "16px",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* 상태 표시 */}
          <div style={{ fontSize: "12px", color: "#666" }}>
            Status: {status} {isAvatarSpeaking && "(발화중)"}
            <br />
            SDK 상태:{" "}
            {isInitializing
              ? "초기화 중..."
              : isSDKInitialized
              ? "사용 중"
              : "대기 중"}
            <br />
            API 키: {SDK_KEY ? "설정됨" : "없음"} | 아바타 ID:{" "}
            {AVATAR_ID ? "설정됨" : "없음"}
          </div>

          {/* SDK 시작/종료 버튼 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={startSDK}
              disabled={isSDKInitialized || isInitializing}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background:
                  isSDKInitialized || isInitializing ? "#6c757d" : "#28a745",
                color: "white",
                cursor:
                  isSDKInitialized || isInitializing
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {isInitializing ? "초기화 중..." : "사용 시작"}
            </button>
            <button
              onClick={stopSDK}
              disabled={!isSDKInitialized || isInitializing}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background:
                  !isSDKInitialized || isInitializing ? "#6c757d" : "#dc3545",
                color: "white",
                cursor:
                  !isSDKInitialized || isInitializing
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              사용 종료
            </button>
          </div>

          {/* 현재 대사 표시 */}
          <div
            style={{
              padding: "12px",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              color: "#333",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              다음 대사
            </div>
            <div>"{echoMessages[currentEchoIndex] || "모든 대사 완료"}"</div>
          </div>

          {/* 대사 제어 버튼들 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={playNextEcho}
              disabled={
                !isSDKInitialized ||
                isAvatarSpeaking ||
                echoMessages.length === 0 ||
                isInitializing ||
                currentEchoIndex >= echoMessages.length // 마지막 대사까지 읽었으면 비활성화
              }
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background:
                  !isSDKInitialized ||
                  isAvatarSpeaking ||
                  echoMessages.length === 0 ||
                  isInitializing ||
                  currentEchoIndex >= echoMessages.length
                    ? "#6c757d"
                    : "#007bff",
                color: "white",
                cursor:
                  !isSDKInitialized ||
                  isAvatarSpeaking ||
                  echoMessages.length === 0 ||
                  isInitializing ||
                  currentEchoIndex >= echoMessages.length
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {currentEchoIndex >= echoMessages.length ? "완료" : "대사 읽기"}
            </button>
            <button
              onClick={resetEchoIndex}
              disabled={!isSDKInitialized || isAvatarSpeaking || isInitializing}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background:
                  !isSDKInitialized || isAvatarSpeaking || isInitializing
                    ? "#6c757d"
                    : "#6f42c1",
                color: "white",
                cursor:
                  !isSDKInitialized || isAvatarSpeaking || isInitializing
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
              }}
            >
              처음부터
            </button>
          </div>

          {/* 발화 중단 버튼 */}
          <button
            onClick={stopSpeech}
            disabled={!isSDKInitialized || !isAvatarSpeaking}
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              border: "1px solid #ddd",
              background:
                !isSDKInitialized || !isAvatarSpeaking ? "#6c757d" : "#ffc107",
              color: "white",
              cursor:
                !isSDKInitialized || !isAvatarSpeaking
                  ? "not-allowed"
                  : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            발화 중단
          </button>
        </div>
      </div>
    </div>
  );
}
