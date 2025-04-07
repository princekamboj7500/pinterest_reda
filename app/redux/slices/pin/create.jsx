import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  data: {
    title : "",
    description : "",
    destination_url : "",
    board_id : null,
    style : {
      text_scaleX : 1,
      text_scaleY : 1,
      text_x : 10,
      text_y: 10,
      text : "Title..",
      text_font_size : 20,
      text_font_family : 'Arial',
      text_color : "#000000",
      text_align : "center",
      text_wieght : "bold",
      text_italic : "normal",
      text_underline : "none",
      rect_bg : "#d3d3d3"
    },
    edited_pin_base64: null,
  },
}

export const pinSlice = createSlice({
  name: 'new_pin',
  initialState,
  reducers: {
    setData : (state,action) =>{
        state.data = action.payload
    }
    
  },
})

// Action creators are generated for each case reducer function
export const { setData } = pinSlice.actions

export default pinSlice.reducer