/* --- Klleon SDK 타입 정의 --- */
type BaseStatus =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTING_FAILED"
  | "SOCKET_CONNECTED"
  | "SOCKET_FAILED"
  | "STREAMING_CONNECTED"
  | "STREAMING_FAILED"
  | "CONNECTED_FINISH"
  | "VIDEO_LOAD"
  | "VIDEO_CAN_PLAY";

type BaseLogLevelType = "debug" | "info" | "warn" | "error" | "silent";
type BaseVoiceCodeType = "ko_kr" | "en_us" | "ja_jp" | "id_id";
type BaseSubtitleCodeType = "ko_kr" | "en_us" | "ja_jp" | "id_id";

enum ResponseChatType {
  TEXT = "TEXT",
  STT_RESULT = "STT_RESULT",
  STT_ERROR = "STT_ERROR",
  WAIT = "WAIT",
  WARN_SUSPENDED = "WARN_SUSPENDED",
  DISABLED_TIME_OUT = "DISABLED_TIME_OUT",
  TEXT_ERROR = "TEXT_ERROR",
  TEXT_MODERATION = "TEXT_MODERATION",
  ERROR = "ERROR",
  PREPARING_RESPONSE = "PREPARING_RESPONSE",
  RESPONSE_IS_ENDED = "RESPONSE_IS_ENDED",
  RESPONSE_OK = "RESPONSE_OK",
  WORKER_DISCONNECTED = "WORKER_DISCONNECTED",
  EXCEED_CONCURRENT_QUOTA = "EXCEED_CONCURRENT_QUOTA",
  START_LONG_WAIT = "START_LONG_WAIT",
  USER_SPEECH_STARTED = "USER_SPEECH_STARTED",
  USER_SPEECH_STOPPED = "USER_SPEECH_STOPPED",
}

export type Status = BaseStatus;
export type LogLevelType = BaseLogLevelType;
export type VoiceCodeType = BaseVoiceCodeType;
export type SubtitleCodeType = BaseSubtitleCodeType;

export interface InitOption {
  sdk_key: string;
  avatar_id: string;
  voice_code?: VoiceCodeType;
  subtitle_code?: SubtitleCodeType;
  voice_tts_speech_speed?: number;
  enable_microphone?: boolean;
  log_level?: LogLevelType;
  custom_id?: string;
  user_key?: string;
}

export interface ChatData {
  message: string;
  chat_type: ResponseChatType;
  time: string;
  id: string;
}

export interface ChangeAvatarOption {
  avatar_id: string;
  subtitle_code?: SubtitleCodeType;
  voice_code?: VoiceCodeType;
  voice_tts_speech_speed?: number; // 0.5 ~ 2.0
}

export interface KlleonChat {
  init: (option: InitOption) => Promise<void>;
  destroy: () => void;
  onChatEvent: (callback: (data: ChatData) => void) => void;
  onStatusEvent: (callback: (status: Status) => void) => void;
  sendTextMessage: (message: string) => void;
  startStt: () => void;
  endStt: () => void;
  cancelStt: () => void;
  echo: (message: string) => void;
  startAudioEcho: (audio: string) => void;
  endAudioEcho: () => void;
  changeAvatar: (option: ChangeAvatarOption) => Promise<void>;
  clearMessageList: () => void;
  stopSpeech: () => void;
}

/* --- 전역 타입 확장 --- */
declare global {
  interface Window {
    KlleonChat: KlleonChat;
  }

  namespace JSX {
    interface IntrinsicElements {
      "avatar-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          class?: string;
        },
        HTMLElement
      >;
      "chat-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          class?: string;
        },
        HTMLElement
      >;
    }
  }
}

// 모듈 타입으로도 확장
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "avatar-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          class?: string;
        },
        HTMLElement
      >;
      "chat-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          class?: string;
        },
        HTMLElement
      >;
    }
  }
}

/* --- 컴포넌트 Props --- */
export interface AvatarProps {
  videoStyle?: React.CSSProperties;
  volume?: number;
}

export interface ChatProps {
  delay?: number;
  type?: "voice" | "text";
  isShowCount?: boolean;
}

// ResponseChatType도 export
export { ResponseChatType };
