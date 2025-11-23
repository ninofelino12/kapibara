import React from 'react';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`relative max-w-[85%] md:max-w-[80%] rounded-lg text-sm md:text-base leading-7
        ${
          isUser
            ? 'bg-zinc-800 text-zinc-100 px-4 py-3'
            : 'text-zinc-300 pl-4 pr-0'
        }
        ${message.isError ? 'text-red-400' : ''}
        `}
      >
        {!isUser && (
            <div className="absolute -left-5 top-1 w-4 h-4 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80">
                <span className="text-[8px] font-bold text-white">G</span>
            </div>
        )}
        
        <div className="flex flex-col gap-3">
            {/* User Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1">
                    {message.attachments.map((att, i) => (
                        <div key={i} className="rounded-lg overflow-hidden border border-zinc-700 bg-black/20 max-w-[200px]">
                            {att.mimeType.startsWith('image/') ? (
                                <img 
                                    src={`data:${att.mimeType};base64,${att.data}`} 
                                    alt="User upload" 
                                    className="w-full h-auto object-cover"
                                />
                            ) : (
                                <div className="p-3 flex items-center gap-2">
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 opacity-70">
                                        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                                     </svg>
                                    <span className="text-xs font-mono">{att.mimeType}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {message.text && (
                <div className="whitespace-pre-wrap break-words font-sans">
                    {message.text}
                </div>
            )}
            
            {/* Model Generated Image */}
            {message.image && (
                <div className="mt-2 rounded-lg overflow-hidden border border-zinc-700 shadow-lg">
                    <img 
                        src={message.image} 
                        alt="Konten yang dibuat" 
                        className="w-full h-auto max-w-sm object-cover bg-zinc-900"
                        loading="lazy"
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;