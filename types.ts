export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 encoded string (tanpa prefix data:mime/type;base64,)
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isError?: boolean;
  image?: string; // Untuk gambar yang dihasilkan Model
  attachments?: Attachment[]; // Untuk file yang diunggah User
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}