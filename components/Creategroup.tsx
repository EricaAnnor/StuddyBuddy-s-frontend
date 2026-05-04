"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { useState } from "react";
import { ArrowLeft, Search, ArrowRight } from "lucide-react";
import GroupMetaData from "./CreateGroupMetadata";


type showGrouptype = {
    setShowGroup: (value: boolean) => void;
    setShowAllUsers: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateGroup = ({ setShowGroup,setShowAllUsers }: showGrouptype) => {

    const [showmembers, setShowmembers] = useState(false)

    const users = useAppSelector((state) => state.allUsersReducer.users)


    const getImageUrl = (imagePath: string | null | undefined) => {
        if (!imagePath) return ""
        // If it already starts with http, return as is
        if (imagePath.startsWith('http')) return imagePath
        // Otherwise, prepend the base URL
        return `https://studybuddy-1-qkcg.onrender.com${imagePath}`
    }

    const [groupdetails, setGroupdetails] = useState<{
        group_name: string,
        description: string | null,
        profile_pic: string | null,
        members: string[]

    }>({
        group_name: "",
        description: null,
        profile_pic: null,
        members: []

    })



    return (


        showmembers ? <GroupMetaData setShowmembers = {setShowmembers} setGroupdetails = {setGroupdetails} group_details={groupdetails } setShowAllUsers={setShowAllUsers}/> : (
            <>
                <div className="bg-gray-900 h-full">

                    <header className="p-4 flex flex-col gap-4 bg-gray-800">
                        <div className=" flex items-center gap-4 ">

                            <button onClick={() => setShowGroup(false)} className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <p className="text-white text-[18px]">
                                Add members
                            </p>
                        </div>
                        <div className="flex justify-center relative  ">

                            <Search className="text-gray-500 w-4 h-4 absolute left-3 bottom-1 " />
                            <input placeholder="Search members ..." className="text-white outline-none pl-10 w-full  text-white placeholder-gray-500   " />
                        </div>
                    </header>

                    <div className="h-[80vh]  relative overflow-y-auto bg-gray-800/50 mt-4 rounded-md">
                        {
                            users.map(user => (
                                <div className="flex gap-2 p-4 items-center border-b border-gray-700/50" >
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-purple-600   accent-violet-600 bg-gray-900 border-gray-700 rounded-md   mr-3 "
                                        onChange={(e) => {

                                            setGroupdetails((prev) => {

                                                if (e.target.checked) {
                                                    return {
                                                        ...prev,
                                                        members: [...prev.members, user.user_id]
                                                    }


                                                }
                                                else {
                                                    return {
                                                        ...prev,
                                                        members: prev.members.filter((cur) => cur != user.user_id)
                                                    }
                                                }
                                            })


                                        }

                                        }
                                    />
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


                                </div>


                            ))
                        }
                        
                        <button
                            className=" fixed  right-[46px] bottom-[40px] w-[54px] h-[54px] bg-violet-600 flex justify-center items-center rounded-full "

                            onClick={() => setShowmembers(true)}
                        >

                            <ArrowRight className="text-white text-xl" />

                        </button>
                    </div>


                </div>
            </>
        )



    );
}

export default CreateGroup