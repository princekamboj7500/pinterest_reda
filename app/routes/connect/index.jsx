import { useEffect, useState } from "react";
import { useFetcher,  useNavigate } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
export default function Index() {
  const shopFetcher = useFetcher()
  const authFetcher = useFetcher()
  const userAccountFetcher = useFetcher()
  const userSaveFetcher = useFetcher()
  const redirectFetcher = useFetcher()
  const [authToken , setAuthToken] = useState("")
  const [refreshAuthToken , setRefreshAuthToken] = useState("")
  const [shopConfig, setShopConfig] = useState(null);


  useEffect(()=>{

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let code = urlParams.get('code');
    let store = urlParams.get('state');
    if(code){
      // get auth key

      setTimeout(()=>{
        authFetcher.submit(
          {
            grant_type : "authorization_code",
            code : code,
            state : store
          },
          { method: "post", action: "/api/pinterest/auth" }
        )
      },5000)
      
    }
  },[])

  useEffect(()=>{
    
    if(authFetcher?.data?.access_token){
       // get user data from pinterest
       setAuthToken(authFetcher.data.access_token)
       setRefreshAuthToken(authFetcher.data.refresh_token)
       userAccountFetcher.submit(
        {
          access_key : authFetcher.data.access_token,
        },
        { method: "post", action: "/api/pinterest/user_account" }
      )
    }
    
  },[authFetcher.data])

  useEffect(()=>{
    /// Save Data to database
    if(userAccountFetcher?.data?.id){
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      let code = urlParams.get('code');
      let store = urlParams.get('state');
      
      userSaveFetcher.submit({  
        shopifyShopId : store,
        pinterestUserId : userAccountFetcher?.data?.id ,
        accessToken  : authToken, 
        refreshToken : refreshAuthToken,
        userName: userAccountFetcher?.data?.username 
      },{ method: "post", action: "/data/users/create" })
    }
  },[userAccountFetcher.data])
    
  useEffect(()=>{
    if(userSaveFetcher?.data?.shopifyShopId){
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      let store = urlParams.get('state');

      if (store) {
        redirectFetcher.submit(
          {
            shop : store,
          },
          { method: "post", action: "/auth/login" }
        )
      }
    }
  },[userSaveFetcher.data])

  return <div style={{display:'flex',height:'400px',justifyContent:'center',alignItems:'center'}}>
  <div style={{
    textAlign: 'center',
    fontFamily: 'sans-serif'
  }}>
    <img style={{width:'50px',height:'50px'}} src={'/loading.svg'}></img>
    <div style={{textAlign:'center'}}>Connecting...</div>
  </div>
  
</div>;
}
