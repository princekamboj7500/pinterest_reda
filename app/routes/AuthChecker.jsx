import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";

const AuthChecker = (props) => {
  const userAccountFetcher = useFetcher();
  const reAuthUserfetcher = useFetcher();
  const userSaveFetcher = useFetcher();

  useEffect(() => {
    const _init = async () => {
      if (props?.storeRegistered && props?.user?.length > 0) {
        await userAccountFetcher.submit(
          {
            access_key: props?.user[0]?.accessToken,
          },
          { method: "post", action: "/api/pinterest/user_check" }
        );
      }
    };

    _init();

    // Optionally, clean up any async operations if needed
    return () => {
      // Cleanup logic
    };
  }, [props.storeRegistered, props.user]); // Added dependencies

  useEffect(() => {
    // token expired check (401)
    if (userAccountFetcher.data === 401 && props.user.length > 0) {
      reAuthUserfetcher.submit(
        {
          refresh_token: props.user[0].refreshToken,
        },
        { method: "post", action: "/api/pinterest/refresh_auth" }
      );
    }
  }, [userAccountFetcher.data, props.user]); // Added dependencies

  useEffect(() => {
    console.log("reAuthUserfetcher", reAuthUserfetcher);
    if (reAuthUserfetcher.data && reAuthUserfetcher.data.access_token) {
      userSaveFetcher.submit(
        {
          shopifyShopId: props.user[0].shopifyShopId,
          accessToken: reAuthUserfetcher.data.access_token,
        },
        { method: "post", action: "/data/users/update" }
      );
    }
  }, [reAuthUserfetcher.data, props.user]); // Added dependencies

  return null;
};

export default AuthChecker;

// import { useEffect, useState ,useMemo, useCallback} from "react";
// import { useFetcher ,useLocation,useNavigate } from "@remix-run/react";

// const AuthChecker = (props)=>{
//     const userAccountFetcher = useFetcher()
//     const reAuthUserfetcher = useFetcher();
//     const userSaveFetcher = useFetcher();
//     useEffect(()=>{

//         const _init = async () => {
//             if(props.storeRegistered == true && props.user.length > 0){
//                 await userAccountFetcher.submit(
//                  {
//                    access_key :  props.user[0].accessToken,
//                  },
//                  { method: "post", action: "/api/pinterest/user_check" }
//                )
//              }
//           };

//           return _init;

//     },[])

//     useEffect(()=>{
//         // token expired

//         if(userAccountFetcher.data == 401){
//             reAuthUserfetcher.submit(
//                 {
//                 refresh_token :  props.user[0].refreshToken,
//                 },
//                 { method: "post", action: "/api/pinterest/refresh_auth" }
//             )
//         }
//     },[userAccountFetcher.data])

//     useEffect(()=>{
//         console.log("reAuthUserfetcher",reAuthUserfetcher.data)
//         if(reAuthUserfetcher.data){
//             userSaveFetcher.submit({
//                 shopifyShopId : props.user[0].shopifyShopId,
//                 accessToken  : reAuthUserfetcher.data.access_token,
//               },{ method: "post", action: "/data/users/update" })
//         }

//     },[reAuthUserfetcher.data])

//     return null
//   }
// export default AuthChecker
