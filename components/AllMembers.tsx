"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { X, Search } from "lucide-react"
import { useAppSelector } from "@/store/hooks"


type showMemebersType = {
  setShowAllMembers: React.Dispatch<React.SetStateAction<boolean>>;
}



export default function AllMembers({ setShowAllMembers }: showMemebersType) {

  const [searchTerm, setSearchTerm] = useState("")
  const [mounted, setMounted] = useState(false)
  const members = useAppSelector((state) => state.chatReducer.group_members)

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return members ?? []
    return (members ?? []).filter((member) => {
      return (
        member.username.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.role.toLowerCase().includes(term)
      )
    })
  }, [members, searchTerm])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-gray-800/70 bg-gray-900/95 shadow-xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-800/60 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Group Members</h2>
            <p className="text-xs text-gray-400 sm:text-sm">
              {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllMembers(false)}
              className="p-2 text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-4 pt-3 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="h-10 w-full rounded-lg border border-gray-700/60 bg-gray-800/60 pl-10 pr-4 text-sm text-white placeholder:text-gray-400 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="rounded-lg border border-gray-800/70 bg-gray-800/30 px-4 py-8 text-center text-sm text-gray-400">
                {searchTerm ? "No members matched your search." : "No members available."}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-800/70 bg-gray-800/35 px-3 py-3 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white sm:text-base">{member.username}</p>
                    <p className="truncate text-xs text-gray-400 sm:text-sm">{member.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-600/20 px-2.5 py-1 text-xs font-medium capitalize text-violet-300">
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    ,
    document.body
  )
}
