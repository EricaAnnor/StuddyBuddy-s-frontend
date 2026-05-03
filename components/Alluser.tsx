"use client";

import { X, Plus, UserCheck, Clock, Search, Users, Camera } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { allUsersThunk } from "@/store/allUsers"
import { friendRequestThunk, updateRequestThunk } from "@/store/friendRequest"
import { setFriendPending, setFriendAccepted, setFriendRejected } from "@/store/allUsers"
import { Button } from "@/components/ui/button"
import CreateGroup from "./Creategroup";

type showUsers = {
    setShowAllUsers: React.Dispatch<React.SetStateAction<boolean>>;
}

const Allusers = ({setShowAllUsers}:showUsers) => {

    const users = useAppSelector((state) => state.allUsersReducer.users)
    type isFriendFormat = "accepted" | "rejected" | "blocked" | "not_friend" | "pending";

    const dispatch = useAppDispatch()
    const usersRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const InputRef = useRef<HTMLInputElement | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [showAllRequests, setShowAllRequests] = useState(false)
    const [showGroup, setShowGroup] = useState(false)


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

    const getImageUrl = (imagePath: string | null | undefined) => {
        if (!imagePath) return ""
        // If it already starts with http, return as is
        if (imagePath.startsWith('http')) return imagePath
        // Otherwise, prepend the base URL
        return `https://studybuddy-ilmw.onrender.com${imagePath}`
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

    const receivedRequestsAll = filteredUsers.filter((user) => user.isFriendRequest === true)
    const receivedRequests = showAllRequests ? receivedRequestsAll : receivedRequestsAll.slice(0, 7)
    const otherUsers = filteredUsers.filter((user) => user.isFriendRequest === false)
    const remaining_request = receivedRequestsAll.slice(7)


    const handleAddFriend = (userId: string) => {

        dispatch(friendRequestThunk({ friend_id: userId }))
            .unwrap()
            .then(
                () => dispatch(setFriendPending({ userid: userId }))
            )
            .catch((error) => {
                console.log(error)
            })


    }

    const handleAcceptFriend = (userId: string) => {

        dispatch(updateRequestThunk({ friend_id: userId, status: "accepted" }))
            .unwrap()
            .then(() => dispatch(setFriendAccepted({ userid: userId })))
            .catch((error) => {
                console.log(error);

            })

    }

    const handleRejectFriend = (userId: string) => {
        dispatch(updateRequestThunk({ friend_id: userId, status: "rejected" }))
            .unwrap()
            .then(() => {
                dispatch(setFriendRejected({ userid: userId }))
            })
            .catch((error) => {
                console.log(error);
            })
    }

    const renderFriendButton = (user: User) => {
        switch (user.isFriend || user.isFriendRequest) {
            case "not_friend":
                return (
                    <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                        onClick={() => handleAddFriend(user.user_id)}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Friend
                    </Button>
                )
            case "rejected":
                return (
                    <Button
                        size="sm"
                        className="bg-yellow-400 hover:bg-violet-500 text-white transition-colors"
                        onClick={() => handleAddFriend(user.user_id)}
                    >
                        Rejected
                    </Button>
                )
            case "pending":
                if (user.isFriendRequest === false) {

                    return (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-yellow-400 hover:bg-gray-800/50 cursor-not-allowed"
                            disabled
                        >
                            <Clock className="w-4 h-4 mr-1" />
                            Pending
                        </Button>
                    )
                }
                else {
                    return (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-500 text-white transition-colors"
                                onClick={() => handleAcceptFriend(user.user_id)}
                            >
                                Accept
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                                onClick={() => { handleRejectFriend(user.user_id) }}
                            >
                                Decline
                            </Button>
                        </div>
                    )

                }
            case "accepted":
                return (
                    <Button size="sm" variant="ghost" className="text-green-400 hover:bg-gray-800/50 cursor-not-allowed" disabled>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Friends
                    </Button>
                )

        }
    }


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
        <div className="bg-gray-900 w-full md:w-86 h-full rounded-md flex flex-col z-50">
            {
                showGroup ? (<CreateGroup setShowGroup={setShowGroup} setShowAllUsers={setShowAllUsers} />) :

                    (
                        <>
                            <div className="static flex justify-between  py-4 px-4 items-end border-b border-gray-700/50">
                                <button
                                    onClick={()=>setShowAllUsers(false)}
                                    className="cursor-pointer"
                                >
                                    <X className="text-white w-6 h-6"/>

                                </button>
                                <p className="text-white text-[20px] font-semibold ">All Users</p>
                                <button onClick={() => setShowGroup(true)} className="flex bg-violet-600 hover:bg-violet-500 text-white transition-colors py-2 px-2 text-sm rounded-md">
                                    <Users className="w-4 h-4 mr-2" />
                                    Create group

                                </button>
                            </div>
                            <div className="flex py-4 px-2 relative justify-center">
                                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                                <input
                                    className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 rounded-lg outline-none focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/20 transition-all w-full h-9 border border-gray-500"
                                    placeholder="Search Users"

                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <h3 className="text-sm font-medium text-violet-400 mb-3 flex items-center px-4">
                                Friend Requests ({receivedRequestsAll.length})
                                {!showAllRequests && receivedRequestsAll.length > 7 && (
                                    <span className="text-xs text-gray-500 ml-2">Showing first 7</span>
                                )}
                            </h3>


                            <div className="h-full rounded-sm bg-gray-800/50 overflow-y-auto ">
                                <div>
                                    {
                                        receivedRequestsAll.length > 0 && (
                                            <div className="h-full rounded-sm bg-gray-800/50 overflow-y-auto ">

                                                {
                                                    receivedRequests.map((user) => (
                                                        <div className="flex gap-2 p-4 items-center border-b border-gray-700/50" >
                                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                                                {user.profile_pic ? (
                                                                    <img
                                                                        src={getImageUrl(user.profile_pic)}
                                                                        alt={user.username}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-violet-600  text-white">
                                                                        <span className="text-lg font-medium">{user.username.charAt(0).toUpperCase()}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white text-[14px] font-medium truncate">{user.username}</h3>
                                                                <p className="text-sm text-gray-400 truncate">{user.major || "No major specified"}</p>
                                                                {/* {user.bio && <p className="text-xs text-gray-500 truncate mt-1">{user.bio}</p>} */}
                                                            </div>

                                                            <div className="flex-shrink-0">{renderFriendButton(user)}</div>

                                                        </div>
                                                    ))
                                                }

                                            </div>
                                        )
                                    }
                                </div>

                                {!showAllRequests && receivedRequestsAll.length > 7 && (
                                    <div className="mt-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllRequests(true)}
                                            className="text-violet-400 hover:text-violet-300 hover:bg-violet-900/20 transition-colors"
                                        >
                                            Load More ({receivedRequestsAll.length - 7} more)
                                        </Button>
                                    </div>
                                )}

                                {showAllRequests && receivedRequestsAll.length > 7 && (
                                    <div className="mt-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllRequests(false)}
                                            className="text-violet-400 hover:text-violet-300 hover:bg-violet-900/20 transition-colors"
                                        >
                                            Show Less
                                        </Button>
                                    </div>
                                )}
                                {
                                    otherUsers.map((user) => (
                                        <div className="flex gap-2 p-4 items-center border-b border-gray-700/50" >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                                {user.profile_pic ? (
                                                    <img
                                                        src={getImageUrl(user.profile_pic)}
                                                        alt={user.username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-violet-600  text-white">
                                                        <span className="text-lg font-medium">{user.username.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white text-[14px] font-medium truncate">{user.username}</h3>
                                                <p className="text-sm text-gray-400 truncate">{user.major || "No major specified"}</p>
                                                {/* {user.bio && <p className="text-xs text-gray-500 truncate mt-1">{user.bio}</p>} */}
                                            </div>

                                            <div className="flex-shrink-0">{renderFriendButton(user)}</div>

                                        </div>
                                    ))
                                }

                            </div>
                        </>
                    )


            }

        </div>);
}

export default Allusers
