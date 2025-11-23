import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, Attachment } from '../types';
import { sendMessageStream, generateImage, resetChat } from '../services/gemini';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: "Halo. Saya Gemini. Saya bisa membantu Anda mengobrol, analisis gambar, membuat gambar, atau mencari data real-time. Coba tanyakan: 'Tampilkan penjualan rumah terbaru' atau unggah gambar untuk bertanya.",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachments]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleReset = () => {
    resetChat();
    setMessages([{
        id: Date.now().toString(),
        role: Role.MODEL,
        text: "Sesi dibersihkan. Siap untuk topik baru.",
        timestamp: new Date()
    }]);
    setAttachments([]);
  };

  const isImageGenerationRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return (
        lower.startsWith('draw') || 
        lower.startsWith('create image') || 
        lower.startsWith('generate image') ||
        lower.startsWith('buatkan gambar') ||
        lower.startsWith('gambar') ||
        lower.includes('buat gambar')
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const newAttachments: Attachment[] = [];

        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                // remove prefix data:mime/type;base64,
                const data = base64.split(',')[1]; 
                newAttachments.push({
                    mimeType: file.type,
                    data: data
                });
            } catch (err) {
                console.error("Gagal membaca file:", err);
            }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
        // Reset value so same file can be selected again if needed
        e.target.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    const userText = inputText.trim();
    const currentAttachments = [...attachments];
    
    // Clear inputs
    setInputText('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const newMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userText,
      attachments: currentAttachments,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();

    try {
        if (isImageGenerationRequest(userText) && currentAttachments.length === 0) {
            // Image Generation Mode (Only if no attachments, otherwise assume context question)
            setMessages((prev) => [
                ...prev,
                {
                  id: botMessageId,
                  role: Role.MODEL,
                  text: "Sedang membuat gambar...",
                  timestamp: new Date(),
                }
            ]);

            const imageBase64 = await generateImage(userText);
            
            if (imageBase64) {
                setMessages((prev) => 
                    prev.map((msg) => 
                        msg.id === botMessageId 
                        ? { ...msg, text: `Berikut adalah gambar untuk: "${userText}"`, image: imageBase64 }
                        : msg
                    )
                );
            } else {
                 setMessages((prev) => 
                    prev.map((msg) => 
                        msg.id === botMessageId 
                        ? { ...msg, text: "Saya tidak dapat membuat gambar untuk permintaan tersebut. Silakan coba lagi." }
                        : msg
                    )
                );
            }

        } else {
            // Text/Multimodal Chat Mode
            let accumulatedText = "";
            setMessages((prev) => [
                ...prev,
                {
                  id: botMessageId,
                  role: Role.MODEL,
                  text: "",
                  timestamp: new Date(),
                }
            ]);

            await sendMessageStream(userText, currentAttachments, (chunk) => {
                accumulatedText += chunk;
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === botMessageId 
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                );
            });
        }
    } catch (error) {
      setMessages((prev) => {
        const exists = prev.find(m => m.id === botMessageId);
        if (exists) {
            return prev.map(msg => msg.id === botMessageId ? {
                ...msg,
                text: "Terjadi kesalahan saat menghubungkan ke model. Silakan coba lagi.",
                isError: true
            } : msg);
        }
        return [
            ...prev,
            {
              id: Date.now().toString(),
              role: Role.MODEL,
              text: "Terjadi kesalahan saat menghubungkan ke model. Silakan coba lagi.",
              timestamp: new Date(),
              isError: true
            }
          ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-black relative border-x border-zinc-900 shadow-2xl shadow-zinc-950">
      
      {/* Header - Minimalist */}
      <header className="flex-none h-14 px-6 border-b border-zinc-900 bg-black/80 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                 <div className="w-2.5 h-2.5 bg-black rounded-full" />
            </div>
            <h1 className="text-sm font-medium text-white tracking-tight">Obrolan Gemini</h1>
        </div>
        <button 
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-white transition-colors duration-200"
        >
            Reset
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length - 1].role === Role.USER && (
           <div className="flex justify-start animate-fade-in pl-4">
                <TypingIndicator />
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area - Command Palette Style */}
      <div className="flex-none p-4 md:p-6 bg-black">
        {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 px-2 overflow-x-auto">
                {attachments.map((att, i) => (
                    <div key={i} className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden flex items-center justify-center">
                            {att.mimeType.startsWith('image/') ? (
                                <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <span className="text-[10px] text-zinc-400 font-mono p-1 break-all text-center">{att.mimeType.split('/')[1]}</span>
                            )}
                        </div>
                        <button 
                            onClick={() => removeAttachment(i)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm transition-colors"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="relative flex flex-col gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 focus-within:border-zinc-600 transition-colors">
            <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya apa saja, atau unggah gambar untuk dianalisis..."
                rows={1}
                className="w-full bg-transparent text-white placeholder-zinc-500 text-sm p-3 focus:outline-none resize-none max-h-48"
                disabled={isLoading}
            />
            
            <div className="flex justify-between items-center px-2 pb-1 border-t border-zinc-800/50 pt-2 mt-1">
                <div className="flex items-center gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf,text/plain"
                        multiple
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Unggah gambar atau file"
                        disabled={isLoading}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="text-[10px] text-zinc-600 font-medium hidden sm:block">GEMINI 3 PRO</span>
                </div>

                <button
                    onClick={handleSendMessage}
                    disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                    className="p-1.5 bg-white text-black rounded-lg hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    aria-label="Kirim pesan"
                >
                    {isLoading ? (
                         <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
        <div className="text-center mt-3">
            <p className="text-[10px] text-zinc-600">
                AI bisa membuat kesalahan. Mohon verifikasi informasi penting.
            </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;