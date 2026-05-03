"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Camera, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { uploadFileThunk } from "@/store/fileUpload"
import { createGroupThunk } from "@/store/groupSlice";
import { updateChat } from "@/store/chatSlice"


type GroupDetails = {
    group_name: string,
    description: string | null,
    profile_pic: string | null,
    members: string[]
}


type GroupMetaDataType = {
    setShowmembers: React.Dispatch<React.SetStateAction<boolean>>;
    setGroupdetails: React.Dispatch<React.SetStateAction<GroupDetails>>;
    group_details: GroupDetails
    setShowAllUsers: React.Dispatch<React.SetStateAction<boolean>>;

};


const GroupMetaData = ({ setShowmembers, setGroupdetails, group_details, setShowAllUsers }: GroupMetaDataType) => {

    const InputRef = useRef<HTMLInputElement | null>(null)
    const dispatch = useAppDispatch()
    const [showMetaData, setShowMetaData] = useState(true)

    const handleSubmit = () => {
        dispatch(createGroupThunk(group_details))
        setShowAllUsers(false)
        dispatch(
            updateChat({
                chat_id: "handle it later",
                chat_type: "group",
                friend_name: group_details.group_name,
                friend_pic: group_details.profile_pic,
            })
        )
    }


    const handleAttachmentSelect = () => {
        InputRef.current?.click()
    }
    const getImageUrl = (imagePath: string | null | undefined) => {
        if (!imagePath) return "/placeholder.svg"
        // If it already starts with http, return as is
        if (imagePath.startsWith('http')) return imagePath
        // Otherwise, prepend the base URL
        return `https://studybuddy-ilmw.onrender.com${imagePath}`
    }

    const handleOnImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            try {
                const fileArray = Array.from(files)
                const result = await dispatch(uploadFileThunk({ images: fileArray })).unwrap()
                const attachmentUrls = result.uploaded_files.map((file) => file.url)




                setGroupdetails((prev) => ({
                    ...prev,
                    profile_pic: attachmentUrls[0]
                }))
            } catch (error) {
                console.log("Upload failed:", error)
            }
        }

        if (e.target) {
            e.target.value = ''
        }
    }

    return (
        showMetaData && (

            <div className="bg-gray-900 h-full">
                <header className="p-4 flex flex-col gap-4  ">
                    <div className=" flex items-center gap-4 ">

                        <button onClick={() => setShowmembers(false)} className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <p className="text-white text-[18px]">
                            New Group
                        </p>
                    </div>
                    <div className="flex justify-center relative  ">

                        {/* <Search className="text-gray-500 w-4 h-4 absolute left-3 bottom-1 " /> */}
                        <div
                            className="mt-16 w-24 h-24 rounded-full flex items-center justify-center cursor-pointer border-2 relative overflow-hidden"
                            onClick={handleAttachmentSelect}
                        >
                            {group_details.profile_pic && (
                                <img
                                    src={getImageUrl(group_details.profile_pic)}
                                    alt="Group"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            )}

                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <input
                        ref={InputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleOnImageChange(e)}

                    />
                </header>

                <div className="flex justify-center ">
                    <input placeholder="Enter group's name" onChange={(e) => setGroupdetails((prev) => ({ ...prev, group_name: e.target.value }))} className="p-4   rounded-md w-80 h-10  border-1 border-gray-700/50 placeholder:text-gray-500 text-white outline-none" />
                </div>

                <div className="flex justify-center ">
                    <input placeholder="Enter group's description" onChange={(e) => setGroupdetails((prev) => ({ ...prev, description: e.target.value }))} className="p-4 my-8   rounded-md w-80 h-10  border-1 border-gray-700/50 placeholder:text-gray-500 text-white outline-none" />
                </div>

                {
                    group_details.group_name !== "" && group_details.members.length >= 1 && (<button
                        className=" fixed  right-[46px] bottom-[40px] w-[54px] h-[54px] bg-violet-600 flex justify-center items-center rounded-full "

                        onClick={() => handleSubmit()}
                    >

                        <ArrowRight className="text-white text-xl" />

                    </button>)
                }



            </div>
        )

    )
}

export default GroupMetaData