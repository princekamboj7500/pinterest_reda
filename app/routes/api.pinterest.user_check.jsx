import {  json } from "@remix-run/node";
import axios from 'axios'
import {parse, stringify, toJSON, fromJSON} from 'flatted';

export const action = async ({ request }) => {
  //const { admin } = await authenticate.admin(request);

    const body = await request.formData();
      // Convert FormData to an object
    let access_key = body.get('access_key')
    const response = await axios.get(process.env.PINTEREST_API_HOST+'/user_account' , {
      headers: {
        'Authorization': `Bearer ${access_key}`, // Pinterest access token
        'Content-Type': 'application/json',
      },
      
    }).catch((error)=>{
      if(error.response.status == 401){
        return {
          data : 401
        }
      }
    });

    return json(response?.data);

}