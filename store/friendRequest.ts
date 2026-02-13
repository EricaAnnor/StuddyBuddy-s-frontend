import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api/apiIntercept";

interface Request {
  friend_id: string;
}

interface Response {
  detail: string;
}

type Status = "accepted" | "rejected" | "blocked";

interface UpdateRequest{
  friend_id:string;
  status:Status
  
}



export const friendRequestThunk = createAsyncThunk<
  Response,        // return type
  Request,         // argument type
  { rejectValue: string }
>(
  "FriendRequestThunk",
  async (arg: Request, { rejectWithValue }) => {
    try {
      const response = await api.post("/friend/sendrequest", arg, {
        headers: { "Content-Type": "application/json" }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Error sending friend request");
    }
  }
);

export const updateRequestThunk = createAsyncThunk<Response,UpdateRequest,{rejectValue:string}>(
  "updateThunk",
  async (arg:UpdateRequest,{rejectWithValue}) => {
    try{

      const response = await api.patch("/friend/update/request",arg,{
        headers:{"Content-Type":"application/json"}
      })

      return response.data

      
    }catch(error:any){
      return rejectWithValue(error.response?.data || "Error updating status"); 
    }
  }
)




