
import { configureStore } from '@reduxjs/toolkit'
import newPinReducer from './slices/pin/create'
import userReducer from './slices/user/index'
export const store = configureStore({
  reducer: {
    new_pin : newPinReducer,
    user : userReducer
  },
})