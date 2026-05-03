import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Phone,
  Video,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
  Users,
  Download,
  FileText,
  X,
  ArrowLeft
} from "lucide-react"
import { useEffect, useState, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatLastSeen } from "@/store/allUsers"
import api from "@/api/apiIntercept";
import AttachmentPopup from "./AttachmentPopup";
import { uploadFileThunk, uploadDocThunk } from "@/store/fileUpload";
import { getFileType } from "@/lib/utils";

type MessageType = "one_on_one" | "group";

interface Message {
  message_id: string;
  message: string | null;
  attachments: string[] | null;
  sender_id: string;
  receiver_id: string;
  group_id?: string;           // FIX: added missing field
  message_type: MessageType;
  created_at: string;
  status: string;
}

interface SendMessage {
  messagetype: MessageType;
  message?: string | null;
  attachments?: string[];
  user_id?: string | null;
  group_id?: string | null;
}

interface paramstype {
  id: string | null;
  m_type: MessageType;
  friend_pic: string | null;
  friend_name: string | null;
  onBack?: () => void;
}

interface Res {
  filename: string;
  url: string;
}

export default function ChatRoom({ id, m_type, friend_pic, friend_name, onBack }: paramstype) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendStatus, setSendStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [receiveStatus, setReceiveStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const tokenFromRedux = useAppSelector((state) => state.loginUser.access_token);
  const tokenFromLocalStorage = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const token = tokenFromRedux || tokenFromLocalStorage;
  const dispatch = useAppDispatch();

  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const sendSocketRef = useRef<WebSocket | null>(null);
  const receiveSocketRef = useRef<WebSocket | null>(null);
  const [message, setMessage] = useState<string>("");

  // CRITICAL FIX: userId must never be undefined for message alignment to work.
  // Read from Redux first, fall back to localStorage so it's available immediately
  // on refresh before Redux has hydrated from the server.
  const userIdFromRedux = useAppSelector((state) => state.loginUser.user?.user_id);
  const userId = userIdFromRedux ?? (typeof window !== "undefined" ? localStorage.getItem("user_id") ?? undefined : undefined);

  const [attachment, setAttachment] = useState<string[]>([]);

  const connectingRef = useRef({ send: false, receive: false });
  const mountedRef = useRef(true);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Res[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist userId to localStorage whenever it becomes available from Redux.
  // This ensures it's readable on next refresh before Redux has re-hydrated.
  useEffect(() => {
    if (userIdFromRedux) {
      localStorage.setItem("user_id", userIdFromRedux);
    }
  }, [userIdFromRedux]);

  // chatContextRef is set SYNCHRONOUSLY on every render (not inside a useEffect)
  // so the WebSocket onmessage handler always reads the freshest id/m_type/userId
  // without any async delay or stale closure.
  const chatContextRef = useRef({ id, m_type, userId });
  chatContextRef.current = { id, m_type, userId };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value);
  }

  const cleanup = useCallback(() => {
    if (sendSocketRef.current) {
      sendSocketRef.current.close(1000, "Component unmounting");
      sendSocketRef.current = null;
    }
    if (receiveSocketRef.current) {
      receiveSocketRef.current.close(1000, "Component unmounting");
      receiveSocketRef.current = null;
    }
    setSendStatus("disconnected");
    setReceiveStatus("disconnected");
    connectingRef.current = { send: false, receive: false };
  }, []);

  // FIX: connectSendSocket only depends on token — no chat-specific deps needed
  const connectSendSocket = useCallback(() => {
    if (!token || !mountedRef.current || connectingRef.current.send) return;
    if (sendSocketRef.current?.readyState === WebSocket.OPEN) return;

    console.log("Connecting to send WebSocket...");
    connectingRef.current.send = true;
    setSendStatus("connecting");

    try {
      const socket = new WebSocket(`wss://studybuddy-ilmw.onrender.com/studybuddy/v1/chat/send?token=${token}`);
      sendSocketRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) { socket.close(); return; }
        console.log("Send WebSocket connected");
        setSendStatus("connected");
        connectingRef.current.send = false;
      };

      socket.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const response = JSON.parse(event.data);
          if (response.status === "success") {
            console.log("Message sent successfully:", response.message_id);
          } else if (response.status === "error") {
            console.error("Send error:", response.message);
          }
        } catch {
          console.log("Send WebSocket raw message:", event.data);
        }
      };

      socket.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log("Send WebSocket disconnected:", event.code, event.reason);
        setSendStatus("disconnected");
        connectingRef.current.send = false;
        sendSocketRef.current = null;
        if (event.code !== 1000 && mountedRef.current) {
          setTimeout(() => { if (mountedRef.current) connectSendSocket(); }, 2000);
        }
      };

      socket.onerror = () => {
        if (!mountedRef.current) return;
        setSendStatus("disconnected");
        connectingRef.current.send = false;
      };
    } catch (error) {
      console.error("Error creating send WebSocket:", error);
      setSendStatus("disconnected");
      connectingRef.current.send = false;
    }
  }, [token]); // FIX: only token — not id/m_type/userId

  // FIX: connectReceiveSocket only depends on token.
  // It reads chat context from chatContextRef.current inside onmessage,
  // so it never needs to reconnect when you switch chats.
  const connectReceiveSocket = useCallback(() => {
    if (!token || !mountedRef.current || connectingRef.current.receive) return;
    if (receiveSocketRef.current?.readyState === WebSocket.OPEN) return;

    console.log("Connecting to receive WebSocket...");
    connectingRef.current.receive = true;
    setReceiveStatus("connecting");

    try {
      const socket = new WebSocket(`wss://studybuddy-ilmw.onrender.com/studybuddy/v1/chat/receive?token=${token}`);
      receiveSocketRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) { socket.close(); return; }
        console.log("Receive WebSocket connected");
        setReceiveStatus("connected");
        connectingRef.current.receive = false;
      };

      socket.onmessage = (event) => {
        if (!mountedRef.current) return;

        // FIX: Read from ref so we always have the current chat's id/m_type/userId
        // even after switching chats — no stale closure possible
        const { id: currentId, m_type: currentType, userId: currentUserId } = chatContextRef.current;

        try {
          const msg = JSON.parse(event.data);

          if (msg.status === "delivered" && msg.data) {
            const messageData = msg.data as Message;

            // FIX: Correct filtering logic using fresh ref values
            let isRelevant = false;

            if (currentType === "one_on_one") {
              // Show message if it belongs to the currently open one-on-one chat.
              // This covers both directions: msg sent to friend, and echo back to sender.
              isRelevant =
                (messageData.sender_id === currentUserId && messageData.receiver_id === currentId) ||
                (messageData.sender_id === currentId && messageData.receiver_id === currentUserId);
            } else if (currentType === "group") {
              // FIX: Match on group_id, NOT receiver_id (old code used receiver_id which is member ID)
              isRelevant =
                messageData.message_type === "group" &&
                messageData.group_id === currentId;
            }

            if (isRelevant) {
              setMessages((prev) => {
                // Deduplicate by message_id
                if (prev.some((m) => m.message_id === messageData.message_id)) return prev;
                return [...prev, messageData].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            }
          } else if (event.data === "ping") {
            socket.send("pong");
          }
        } catch {
          if (event.data === "ping") socket.send("pong");
        }
      };

      socket.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log("Receive WebSocket disconnected:", event.code, event.reason);
        setReceiveStatus("disconnected");
        connectingRef.current.receive = false;
        receiveSocketRef.current = null;
        if (event.code !== 1000 && mountedRef.current) {
          setTimeout(() => { if (mountedRef.current) connectReceiveSocket(); }, 2000);
        }
      };

      socket.onerror = () => {
        if (!mountedRef.current) return;
        setReceiveStatus("disconnected");
        connectingRef.current.receive = false;
      };
    } catch (error) {
      console.error("Error creating receive WebSocket:", error);
      setReceiveStatus("disconnected");
      connectingRef.current.receive = false;
    }
  }, [token]); // FIX: only token — switching chats no longer triggers reconnect

  // FIX: This effect only manages WebSocket connections — runs once on mount / token change.
  // It no longer depends on connectReceiveSocket having chat-specific deps.
  useEffect(() => {
    mountedRef.current = true;
    if (!token) return;

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        connectSendSocket();
        connectReceiveSocket();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      mountedRef.current = false;
      cleanup();
    };
  }, [token, connectSendSocket, connectReceiveSocket, cleanup]);

  // Fetch past messages — MUST include userId in deps.
  // If userId is undefined (Redux not yet hydrated on refresh), skip and wait.
  // Once userId resolves, this re-runs and renders messages with correct alignment.
  useEffect(() => {
    if (!id || !token || !userId) return;

    setMessages([]);
    setAttachment([]);
    setUploadedFiles([]);

    const fetchPastMessages = async () => {
      try {
        const endpoint =
          m_type === "one_on_one"
            ? `/messages/one_on_one/${id}`
            : `/messages/group/${id}`;
        const res = await api.get(endpoint);
        const pastMessages: Message[] = res.data.messages || [];
        setMessages(
          pastMessages.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
      } catch (err) {
        console.error("Failed to fetch past messages:", err);
      }
    };

    fetchPastMessages();
  }, [id, m_type, token, userId]); // userId in deps: re-fetches once it stops being undefined

  const handleSendMessage = useCallback(() => {
    if (
      (!message.trim() && attachment.length === 0) ||
      !sendSocketRef.current ||
      sendSocketRef.current.readyState !== WebSocket.OPEN
    ) {
      console.log("Cannot send:", {
        hasMessage: !!message.trim(),
        socketState: sendSocketRef.current?.readyState,
      });
      return;
    }

    const curMessage: SendMessage = {
      messagetype: m_type,
      message: message.trim(),
      attachments: attachment.length > 0 ? attachment : [],
      user_id: m_type === "one_on_one" ? id : null,
      group_id: m_type === "group" ? id : null,
    };

    try {
      sendSocketRef.current.send(JSON.stringify(curMessage));
      setMessage("");
      setAttachment([]);
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [message, attachment, m_type, id]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const [online, setOnline] = useState<boolean>(false);
  const [lastseen, setLastseen] = useState<number>(0);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchPresence = async () => {
      try {
        const result = await api.get(`/checkpresence/${id}`);
        setOnline(result.data.online);
        setLastseen(result.data.time);
      } catch (error) {
        console.error(error);
      }
    };
    fetchPresence();
    presenceRef.current = setInterval(fetchPresence, 30_000);
    return () => {
      if (presenceRef.current) clearInterval(presenceRef.current);
    };
  }, [id]); // FIX: added id as dep so it resets when switching chats

  const connectionStatus =
    sendStatus === "connected" && receiveStatus === "connected"
      ? "connected"
      : sendStatus === "connecting" || receiveStatus === "connecting"
      ? "connecting"
      : "disconnected";

  const handleAttachmentSelect = (type: "document" | "photo" | "video") => {
    if (type === "photo") photoInputRef.current?.click();
    if (type === "video") videoInputRef.current?.click();
    if (type === "document") docInputRef.current?.click();
  };

  const handleOnImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        const fileArray = Array.from(files);
        const result = await dispatch(uploadFileThunk({ images: fileArray })).unwrap();
        if (result.uploaded_files?.length > 0) {
          setAttachment((prev) => [...prev, ...result.uploaded_files.map((f: Res) => f.url)]);
          setUploadedFiles((prev) => [...prev, ...result.uploaded_files]);
        }
      } catch (error) {
        console.log("Upload failed:", error);
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleOnFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        const fileArray = Array.from(files);
        const result = await dispatch(uploadDocThunk({ documents: fileArray })).unwrap();
        if (result.uploaded_files?.length > 0) {
          setAttachment((prev) => [...prev, ...result.uploaded_files.map((f: Res) => f.url)]);
          setUploadedFiles((prev) => [...prev, ...result.uploaded_files]);
        }
      } catch (error) {
        console.log("Upload failed:", error);
      }
    }
    if (e.target) e.target.value = "";
  };

  const AttachmentRenderer = ({ attachmentUrl, isOwn }: { attachmentUrl: string; isOwn: boolean }) => {
    if (!attachmentUrl) return null;
    const check = getFileType(attachmentUrl);
    const filename = attachmentUrl.split("/").pop() || "Unknown file";

    switch (check) {
      case "photo":
        return (
          <div className="mt-2">
            <div className="relative cursor-pointer" onClick={() => setImageExpanded(true)}>
              <img
                src={`https://studybuddy-ilmw.onrender.com${attachmentUrl}`}
                alt={filename}
                className="max-w-xs max-h-48 object-cover rounded-lg"
              />
            </div>
            {imageExpanded && (
              <div
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                onClick={() => setImageExpanded(false)}
              >
                <img
                  src={`https://studybuddy-ilmw.onrender.com${attachmentUrl}`}
                  alt={filename}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        );

      case "document":
        return (
          <div
            className={`mt-2 p-3 rounded-lg border ${
              isOwn ? "bg-purple-700/30 border-purple-500/30" : "bg-gray-700/50 border-gray-600/50"
            } hover:bg-opacity-80 transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOwn ? "bg-purple-600/50" : "bg-gray-600/50"}`}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{filename}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-600/50 transition-all">
                <a href={`https://studybuddy-ilmw.onrender.com${attachmentUrl}`}>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        );

      case "video":
        return (
          <div className="mt-2">
            <div className="relative cursor-pointer rounded-lg">
              <video
                src={`https://studybuddy-ilmw.onrender.com${attachmentUrl}`}
                className="max-w-xs max-h-32 object-cover rounded-lg"
                controls
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachment((prev) => prev.filter((_, i) => i !== indexToRemove));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return "/placeholder.svg";
    if (imagePath.startsWith("http")) return imagePath;
    return `https://studybuddy-ilmw.onrender.com${imagePath}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden text-gray-400 hover:text-white p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="relative">
              <img
                src={getImageUrl(friend_pic)}
                alt={friend_name || "friend"}
                className="w-10 h-10 rounded-full object-cover shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold">{friend_name}</h2>
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                  title={`Connection: ${connectionStatus}`}
                />
              </div>
              <p className="text-sm text-gray-400">
                {m_type === "group"
                  ? "Group chat"
                  : online
                  ? "Online"
                  : lastseen
                  ? formatLastSeen(lastseen * 1000)
                  : "Last seen a while ago"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
              <Video className="w-5 h-5" />
            </Button>
            {m_type === "group" && (
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
                <Users className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Debug bar — remove in production */}
      <div className="px-4 py-2 bg-gray-900/50 text-xs text-gray-400">
        Send: {sendStatus} | Receive: {receiveStatus} | Messages: {messages.length}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
            {connectionStatus !== "connected" && (
              <p className="text-yellow-500 mt-2">Connecting to chat...</p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`flex gap-3 ${userId === msg.sender_id ? "flex-row-reverse" : "flex-row"}`}
            >
              {userId !== msg.sender_id && (
                <img
                  src={friend_pic || "/placeholder.svg"}
                  alt={friend_name || "friend"}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm"
                />
              )}
              <div className={`max-w-xs lg:max-w-md ${userId === msg.sender_id ? "ml-auto" : "mr-auto"}`}>
                {userId !== msg.sender_id && (
                  <p className="text-xs text-gray-400 mb-1">{friend_name}</p>
                )}
                {msg.message && msg.message.trim() && (
                  <div
                    className={`px-4 py-2 rounded-2xl shadow-sm ${
                      userId === msg.sender_id
                        ? "bg-purple-600 text-white rounded-br-md shadow-purple-600/20"
                        : "bg-gray-800/80 text-white rounded-bl-md shadow-lg"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                )}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`space-y-2 ${msg.message?.trim() ? "mt-2" : ""}`}>
                    {msg.attachments.map((url, index) => (
                      <div key={index} className="overflow-hidden rounded-lg">
                        <AttachmentRenderer attachmentUrl={url} isOwn={userId === msg.sender_id} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                  {userId === msg.sender_id && (
                    <span
                      className={`text-xs ${
                        msg.status === "delivered"
                          ? "text-green-400"
                          : msg.status === "sent"
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    >
                      {msg.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-sm relative">
        {uploadedFiles.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 flex flex-wrap gap-2 max-h-24 backdrop-blur-sm rounded-lg p-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative bg-gray-700 rounded-lg p-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-300 truncate max-w-32">{file.filename}</span>
                <button onClick={() => removeAttachment(index)} className="text-gray-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
            onClick={() => setShowAttachmentPopup(true)}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={connectionStatus !== "connected"}
              className="bg-gray-800/60 border-gray-600/50 text-white placeholder-gray-500 rounded-full pr-12 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/20 transition-all shadow-inner disabled:opacity-50"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && attachment.length === 0) || connectionStatus !== "connected"}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full p-2 shadow-lg transition-all"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        {connectionStatus !== "connected" && (
          <div className="text-center mt-2">
            <span className={`text-xs ${connectionStatus === "connecting" ? "text-yellow-400" : "text-red-400"}`}>
              {connectionStatus === "connecting" ? "Connecting..." : "Connection lost — attempting to reconnect..."}
            </span>
          </div>
        )}
      </div>

      <AttachmentPopup
        isOpen={showAttachmentPopup}
        onClose={() => setShowAttachmentPopup(false)}
        onAttachmentSelect={handleAttachmentSelect}
      />
      <input ref={photoInputRef} onChange={handleOnImageChange} type="file" accept="image/*" multiple className="hidden" />
      <input ref={videoInputRef} onChange={handleOnImageChange} type="file" accept="video/*" multiple className="hidden" />
      <input ref={docInputRef} onChange={handleOnFileChange} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx" multiple className="hidden" />
    </div>
  );
}