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

  // 에코 메시지 관련 상태
  const [echoMessages] = useState<string[]>(echoMessagesData);
  const [currentEchoIndex, setCurrentEchoIndex] = useState(0);

  const avatarRef = useRef<HTMLElement & AvatarProps>(null);

  // 컴포넌트 마운트 시 이벤트 리스너만 설정 (SDK 초기화는 하지 않음)
  useEffect(() => {
    // 아바타 설정
    if (avatarRef.current) {
      avatarRef.current.videoStyle = {
        borderRadius: "30px",
        objectFit: "cover",
      };
      avatarRef.current.volume = 100;
    }
  }, []);

  // SDK 시작 함수
  const startSDK = async () => {
    const { KlleonChat } = window;

    try {
      // 1. Status 이벤트 리스너 등록
      KlleonChat.onStatusEvent((status) => {
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

      // 3. SDK 초기화 (실제 키 사용)
      await KlleonChat.init({
        sdk_key: SDK_KEY,
        avatar_id: AVATAR_ID,
      });

      setIsSDKInitialized(true);
      console.log("SDK 초기화 완료");
    } catch (error) {
      console.error("SDK 초기화 실패:", error);
    }
  };

  // SDK 종료 함수
  const stopSDK = async () => {
    const { KlleonChat } = window;

    try {
      // 빈 키로 재초기화하여 종료
      await KlleonChat.init({
        sdk_key: "",
        avatar_id: AVATAR_ID,
      });

      // 또는 완전 종료
      KlleonChat.destroy();

      setIsSDKInitialized(false);
      setStatus("IDLE");
      setIsAvatarSpeaking(false);
      console.log("SDK 종료 완료");
    } catch (error) {
      console.error("SDK 종료 실패:", error);
    }
  };

  // 다음 대사 읽기 함수
  const playNextEcho = () => {
    const { KlleonChat } = window;

    if (!isSDKInitialized) {
      alert("먼저 사용을 시작해주세요.");
      return;
    }

    if (echoMessages.length > 0) {
      const messageToSpeak = echoMessages[currentEchoIndex];
      KlleonChat.echo(messageToSpeak);

      // 다음 인덱스로 이동 (마지막이면 처음으로 돌아감)
      setCurrentEchoIndex((prevIndex) => (prevIndex + 1) % echoMessages.length);
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
            SDK 상태: {isSDKInitialized ? "사용 중" : "대기 중"}
          </div>

          {/* SDK 시작/종료 버튼 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={startSDK}
              disabled={isSDKInitialized}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background: isSDKInitialized ? "#6c757d" : "#28a745",
                color: "white",
                cursor: isSDKInitialized ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              사용 시작
            </button>
            <button
              onClick={stopSDK}
              disabled={!isSDKInitialized}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background: !isSDKInitialized ? "#6c757d" : "#dc3545",
                color: "white",
                cursor: !isSDKInitialized ? "not-allowed" : "pointer",
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
              현재 대사 ({currentEchoIndex + 1}/{echoMessages.length}):
            </div>
            <div>"{echoMessages[currentEchoIndex] || "없음"}"</div>
          </div>

          {/* 대사 제어 버튼들 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={playNextEcho}
              disabled={
                !isSDKInitialized ||
                isAvatarSpeaking ||
                echoMessages.length === 0
              }
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background:
                  !isSDKInitialized ||
                  isAvatarSpeaking ||
                  echoMessages.length === 0
                    ? "#6c757d"
                    : "#007bff",
                color: "white",
                cursor:
                  !isSDKInitialized ||
                  isAvatarSpeaking ||
                  echoMessages.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              다음 대사 읽기
            </button>
            <button
              onClick={resetEchoIndex}
              disabled={!isSDKInitialized || isAvatarSpeaking}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background:
                  !isSDKInitialized || isAvatarSpeaking ? "#6c757d" : "#6f42c1",
                color: "white",
                cursor:
                  !isSDKInitialized || isAvatarSpeaking
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
