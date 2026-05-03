"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { BookOpen, Settings, Bell, Users } from "lucide-react"
import ChatSidebar from "@/components/ChatSidebar"
import ChatRoom from "@/components/ChatRoom"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { refreshThunk } from "@/store/loginSlice"
import Allusers from "@/components/Alluser"
import EditProfile from "@/components/Profile"

export default function DashboardPage() {
    // State management for the main chat interface
    const { chat_id, chat_type, cur_tab, friend_name, friend_pic } = useAppSelector((state) => state.chatReducer)

    const tokenFromRedux = useAppSelector((state) => state.loginUser.access_token);
    const tokenFromLocalStorage = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const [isAllUsersOpen, setIsAllUsersOpen] = useState(false)
    const [mobileShowChat, setMobileShowChat] = useState(false)


    const token = tokenFromRedux || tokenFromLocalStorage;
    const dispatch = useAppDispatch();
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false)
    const user = useAppSelector((state) => state.profileReducer.user)
    const [showAllUsers,setShowAllUsers] = useState(false)


    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

    const getImageUrl = (imagePath: string | null | undefined) => {
        if (!imagePath) return null;
        // If it already starts with http, return as is
        if (imagePath.startsWith('http')) return imagePath
        // Otherwise, prepend the base URL
        return `https://studybuddy-ilmw.onrender.com${imagePath}`
    }

    const imgsrc = getImageUrl(user?.profile_pic)
    const img_ = user?.username.trim()[0]

    // Cleanup function
    const cleanup = useCallback(() => {
        mountedRef.current = false;

        // Clear all timers
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close WebSocket properly
        if (socketRef.current) {
            socketRef.current.close(1000, 'Component unmounting');
            socketRef.current = null;
        }

        setConnectionStatus('disconnected');
    }, []);

    // Connect to presence WebSocket
    const connectWebSocket = useCallback(() => {
        if (!token || !mountedRef.current) {
            console.log("Cannot connect: no token or component unmounted");
            return;
        }

        // Don't create multiple connections
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected");
            return;
        }

        // Clean up existing connection
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        setConnectionStatus('connecting');
        console.log("Connecting to presence WebSocket...");

        try {
            const socket = new WebSocket(`wss://studybuddy-ilmw.onrender.com/studybuddy/v1/presence?token=${token}`);
            socketRef.current = socket;

            socket.onopen = () => {
                if (!mountedRef.current) {
                    socket.close();
                    return;
                }

                console.log("Presence WebSocket connected");
                setConnectionStatus('connected');

                // Clear any existing heartbeat
                if (heartbeatRef.current) {
                    clearInterval(heartbeatRef.current);
                }

                // Send heartbeat every 25 seconds (before the 30s server timeout)
                heartbeatRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN && mountedRef.current) {
                        // Send plain text "heartbeat" as expected by your FastAPI server
                        socket.send("heartbeat");
                        console.log("Heartbeat sent");
                    }
                }, 25000);
            };

            socket.onmessage = (event) => {
                if (!mountedRef.current) return;

                try {
                    const message = JSON.parse(event.data);
                    console.log("Presence WebSocket message:", message);

                    if (message.status === "error") {
                        console.error("Presence error:", message);

                        // Handle authentication errors by refreshing token
                        if (["INVALID_TOKEN", "NO_TOKEN", "INVALID_PAYLOAD", "INVALID_SUB"].includes(message.code)) {
                            console.warn("Authentication error, refreshing token...");
                            dispatch(refreshThunk());
                        }
                    }
                } catch (error) {
                    // Handle non-JSON messages
                    console.log("Non-JSON presence message:", event.data);
                }
            };

            socket.onerror = (event) => {
                if (!mountedRef.current) return;
                console.error("Presence WebSocket error:", event);
                setConnectionStatus('disconnected');
            };

            socket.onclose = (event) => {
                if (!mountedRef.current) return;

                console.log("Presence WebSocket closed:", event.code, event.reason);
                setConnectionStatus('disconnected');
                socketRef.current = null;

                // Clear heartbeat
                if (heartbeatRef.current) {
                    clearInterval(heartbeatRef.current);
                    heartbeatRef.current = null;
                }

                // Auto-reconnect unless it was a normal closure or authentication error
                if (event.code !== 1000 && event.code !== 1008 && mountedRef.current) {
                    console.log("WebSocket closed unexpectedly, reconnecting in 5 seconds...");
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current) {
                            console.log("Attempting to reconnect...");
                            connectWebSocket();
                        }
                    }, 5000);
                }
            };

        } catch (error) {
            console.error("Error creating presence WebSocket:", error);
            setConnectionStatus('disconnected');
        }
    }, [token, dispatch]);

    // Connect when component mounts or token changes
    useEffect(() => {
        mountedRef.current = true;

        if (!token) {
            console.log("No token available for presence connection");
            cleanup();
            return;
        }

        // Small delay to prevent rapid reconnections
        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                connectWebSocket();
            }
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            cleanup();
        };
    }, [token, connectWebSocket, cleanup]);

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Top navbar */}
            <div className="fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-sm shadow-lg px-4 sm:px-6 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white text-base sm:text-lg font-bold">StudyBuddy</span>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                    'bg-red-500'
                                }`}></div>
                            <span className="text-xs text-gray-400 capitalize hidden sm:inline">{connectionStatus}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllUsers(!showAllUsers)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors p-1.5"
                            title="All Users"
                        >
                            <Users className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors p-1.5"
                        >
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors p-1.5"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-purple-500 transition-colors" onClick={() => setIsEditProfileOpen(true)}>
                            {imgsrc ? (
                                <img
                                    src={imgsrc || "/placeholder.svg"}
                                    alt="Profile avatar"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-white text-xs font-medium">
                                    {img_ ? img_ : "JD"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 pt-14 overflow-hidden h-screen">
                {/* Sidebar — full width on mobile (hidden when chat is open), fixed width on desktop */}
                <div className={`
                    ${mobileShowChat ? "hidden md:flex" : "flex"}
                    flex-col w-full md:w-80 flex-shrink-0
                    bg-gray-900/50 backdrop-blur-sm md:rounded-l-xl
                    shadow-xl border-r border-gray-800/50 md:border md:m-4 md:rounded-xl
                `}>
                    {isEditProfileOpen
                        ? <EditProfile isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
                        : <ChatSidebar onChatSelect={() => setMobileShowChat(true)} />
                    }
                </div>

                {/* Chat room — full width on mobile when open, flex-1 on desktop */}
                <div className={`
                    ${mobileShowChat ? "flex" : "hidden md:flex"}
                    flex-1 flex-col
                    bg-gray-900/50 backdrop-blur-sm
                    shadow-xl border-gray-800/50 md:border md:m-4 md:ml-0 md:rounded-xl
                `}>
                    {(chat_type !== "no chat") &&
                        <ChatRoom
                            id={chat_id}
                            m_type={chat_type}
                            friend_pic={friend_pic}
                            friend_name={friend_name}
                            onBack={() => setMobileShowChat(false)}
                        />
                    }
                </div>

                {/* All Users — fixed full-screen overlay on mobile, inline panel on desktop */}
                {showAllUsers && (
                    <div className="fixed inset-0 pt-14 md:static md:inset-auto md:pt-0 z-40 md:z-auto md:flex md:flex-shrink-0 md:m-4 md:ml-0">
                        <Allusers setShowAllUsers={setShowAllUsers} />
                    </div>
                )}
            </div>
        </div>
    )
}