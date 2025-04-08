import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: {},
}

export const pinSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData : (state,action) =>{
        state.user = action.payload
    }
  
  },
})

// Action creators are generated for each case reducer function
export const { setUserData } = pinSlice.actions

export default pinSlice.reducer