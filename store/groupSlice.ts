import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/api/apiIntercept";


// =======================
// Types
// =======================

export type MemberRole = "member" | "admin";

export interface GroupMember {
    user_id: string;
    username: string;
    email: string;
    role: MemberRole;
}

export interface Group {
    group_id: string;
    profile_pic: string | null;
    owner: string;
    group_name: string;
    description: string | null;
    members: GroupMember[]; // ✅ added
}

export interface GroupCreate {
    group_name: string;
    description: string | null;
    profile_pic: string | null;
    members: string[];
}

export interface GroupCreateResponse extends Group {}

export interface GroupResponse {
    user_groups: Group[];
}


// =======================
// Thunks
// =======================

export const groupthunk = createAsyncThunk<
    GroupResponse,
    void,
    { rejectValue: string }
>(
    "groups/fetchUserGroups",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/groupmembers");
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data || "Error fetching groups"
            );
        }
    }
);

export const createGroupThunk = createAsyncThunk<
    GroupCreateResponse,
    GroupCreate,
    { rejectValue: string }
>(
    "groups/createGroup",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await api.post("/group", payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data || "Error creating group"
            );
        }
    }
);


// =======================
// State
// =======================

interface SliceState {
    loading: boolean;
    error: string | null;
    groups: Group[];
    lastFetched: number;
    createLoading: boolean;
    createError: string | null;
}

const initialState: SliceState = {
    loading: false,
    error: null,
    groups: [],
    lastFetched: 0,
    createLoading: false,
    createError: null,
};


// =======================
// Slice
// =======================

const groupslice = createSlice({
    name: "groups",
    initialState,
    reducers: {
        updateLastFetched: (state) => {
            state.lastFetched = Date.now();
        },
    },
    extraReducers: (builder) => {

        // -------- Fetch Groups --------
        builder
            .addCase(groupthunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(groupthunk.fulfilled, (state, action) => {
                state.loading = false;
                state.groups = action.payload.user_groups; // ✅ correct
                state.lastFetched = Date.now();
            })
            .addCase(groupthunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? "Failed to fetch groups";
            });

        // -------- Create Group --------
        builder
            .addCase(createGroupThunk.pending, (state) => {
                state.createLoading = true;
                state.createError = null;
            })
            .addCase(createGroupThunk.fulfilled, (state, action) => {
                state.createLoading = false;

                // ✅ Add full group (including members)
                state.groups.unshift(action.payload);
            })
            .addCase(createGroupThunk.rejected, (state, action) => {
                state.createLoading = false;
                state.createError =
                    action.payload ?? "Failed to create group";
            });
    },
});

export const { updateLastFetched } = groupslice.actions;
export default groupslice.reducer;