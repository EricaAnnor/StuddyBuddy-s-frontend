import { createSlice,PayloadAction } from "@reduxjs/toolkit";

type MessageType = "one_on_one" | "group" ;

interface chatState {
  id: string | null,
  m_type: MessageType
  friend_pic: string | null
  friend_name: string | null
}

const initialState:chatState = {
    id:null,
    m_type: "one_on_one",
    friend_pic: null,
    friend_name:null
}






const chatSlice = createSlice({
    name: "ChatSlice",
    initialState,

    reducers:{

        changeChatRoom: (state,action: PayloadAction<chatState>)=>{

            state.id = action.payload.id
            state.friend_name = action.payload.friend_name
            state.friend_pic = action.payload.friend_pic
            state.m_type = action.payload.m_type

        }

    }
})

export default chatSlice.reducer


