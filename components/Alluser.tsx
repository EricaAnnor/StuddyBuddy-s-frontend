"use client";

import { Users, Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { allUsersThunk } from "@/store/allUsers"
import { friendRequestThunk, updateRequestThunk } from "@/store/friendRequest"
import { setFriendPending, setFriendAccepted, setFriendRejected } from "@/store/allUsers"


const Allusers = () => {

    const users = useAppSelector((state) => state.allUsersReducer.users)
    type isFriendFormat = "accepted" | "rejected" | "blocked" | "not_friend" | "pending";

    const dispatch = useAppDispatch()
    const usersRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const InputRef = useRef<HTMLInputElement | null>(null)
    const [searchTerm, setSearchTerm] = useState("")


    interface User {
        user_id: string;
        username: string;
        email: string;
        major: string | null;
        bio: string | null;
        profile_pic: string | null;
        isFriend: isFriendFormat;
        isFriendRequest: boolean
    }

    interface AllUsersProps {
        isOpen: boolean
        onClose: () => void
    }

    const filteredUsers = users.filter(
        (user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.major?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.bio?.toLowerCase().includes(searchTerm.toLowerCase()),
    )


    useEffect(() => {
        dispatch(allUsersThunk()); // fetch immediately

        usersRef.current = setInterval(() => {
            dispatch(allUsersThunk());
        }, 30_000);

        return () => {
            if (usersRef.current) clearInterval(usersRef.current);
        };
    }, []);


    return (
        <div className="bg-gray-900/50 w-80 h-full rounded-sm flex flex-col bg-black/50 z-50">
            <div className="static flex justify-between  py-4 px-4 items-end border-b border-gray-700/50">
                <p className="text-white text-[20px] font-semibold ">All Users</p>
                <button className="flex bg-violet-600 hover:bg-violet-500 text-white transition-colors py-2 px-2 text-sm rounded-md">
                    <Users className="w-4 h-4 mr-2" />
                    Create group

                </button>
            </div>
            <div className="flex py-4 px-2 relative justify-center">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 rounded-lg outline-none focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/20 transition-all w-full h-9 border border-gray-500"
                    placeholder="Search Users"

                    onChange={(e)=>setSearchTerm(e.target.value)}
                />
            </div>

            <div>
                
            </div>


        </div>);
}

export default Allusers