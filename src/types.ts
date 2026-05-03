// ==================== 用户相关类型 ====================
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// ==================== API 响应类型 ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface AuthResponse extends ApiResponse {
  user?: Omit<User, 'password'>;
}

// ==================== 音频相关类型 ====================
export interface AudioSegment {
  id: string;
  label: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  subtitle?: string; // Optional per-segment transcript
}

export interface ListeningMaterial {
  id: string;
  title: string;
  audioUrl: string | null;
  script: string;
  segments: AudioSegment[];
  lastModified: number;
  authorId?: string;
}

// ==================== 应用状态类型 ====================
export interface AppState {
  user: User | null;
  materials: ListeningMaterial[];
  currentMaterialId: string | null;
  mode: 'library' | 'setup' | 'edit' | 'train';
  playbackSpeed: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

// ==================== 组件 Props 类型 ====================
export interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: LoginRequest | RegisterRequest) => Promise<void>;
  error?: string | null;
}

export interface MaterialCardProps {
  material: ListeningMaterial;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onTitleChange: (title: string) => void;
}

export interface AudioPlayerProps {
  audioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onSkip: (seconds: number) => void;
}

export interface SegmentListProps {
  segments: AudioSegment[];
  activeIndex: number | null;
  editingIndex: number;
  onSelect: (index: number) => void;
  onEdit: (index: number, segment: Partial<AudioSegment>) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

