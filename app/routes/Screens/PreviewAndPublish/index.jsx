import { useEffect, useCallback, useMemo, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import { SearchIcon } from "@shopify/polaris-icons";
import {
  Page,
  Toast,
  Text,
  Card,
  Button,
  TextField,
  Select,
  DatePicker,
  Banner,
} from "@shopify/polaris";
import styles from "../../styles";
import { useSelector, useDispatch } from "react-redux";
import { setData } from "../../../redux/slices/pin/create.jsx";
import { toast } from "react-toastify";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import moment from "moment";

export default function CreatePin() {
  const [buttonPressed, setButtonPressed] = useState(false);

  const [error, setError] = useState("");
  const navigate = useNavigate();
  const new_pin_data = useSelector((state) => state.new_pin.data);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const pinterestFetcher = useFetcher();
  const storePinFetcher = useFetcher();
  const DraftPinFetcher = useFetcher();
  const [scheduleButtonPressed, setScheduleButtonPressed] = useState(false);
  const [draftButtonPressed, setDraftButtonPressed] = useState(false);
  const SchedulePinFetcher = useFetcher();

  //
  const [errorToastActive, setErrorToastActive] = useState(false);
  const [errorToastMsg, setErrorToastMsg] = useState("");
  const toggleErrorToastActive = useCallback(
    () => setErrorToastActive((active) => !active),
    []
  );
  const ErrorToast = errorToastActive ? (
    <Toast
      content={errorToastMsg}
      error
      onDismiss={toggleErrorToastActive}
      duration={4500}
    />
  ) : null;

  const [scheduleToastActive, setScheduleToastActive] = useState(false);
  const [scheduleToastMsg, setScheduleToastMsg] = useState("");
  const toggleScheduleToastActive = useCallback(
    () => setScheduleToastActive((active) => !active),
    []
  );
  const scheduleToast = scheduleToastActive ? (
    <Toast
      content={scheduleToastMsg}
      onDismiss={toggleScheduleToastActive}
      duration={4500}
    />
  ) : null;

  const [selectedDates, setSelectedDates] = useState({
    start: new Date(),
    end: new Date(),
  });

  const currentTime = moment();
  const updatedTime = currentTime.add(20, "minutes");

  const currentHour = updatedTime.format("h"); // 12-hour format hour
  const currentMinutes = updatedTime.format("mm"); // Minutes
  const currentPeriod = updatedTime.format("A"); // AM or PM

  const [hour, setHour] = useState(currentHour);
  const [minute, setMinute] = useState(currentMinutes);
  const [meridian, setMeridian] = useState(currentPeriod);
  const [errors, setErrors] = useState({ hour: "", minute: "" });

  const handleDateChange = useCallback((value) => setSelectedDates(value), []);

  const handleHourChange = useCallback((value) => {
    const hourValue = parseInt(value, 10);
    // Validate hour to be within 1-12
    if (!value || hourValue < 1 || hourValue > 12) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        hour: "Hour must be between 1 and 12",
      }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, hour: "" }));
    }
    setHour(value);
  }, []);

  const handleMinuteChange = useCallback((value) => {
    const minuteValue = parseInt(value, 10);
    // Validate minute to be within 0-59
    if (!value || minuteValue < 0 || minuteValue > 59) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        minute: "Minute must be between 0 and 59",
      }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, minute: "" }));
    }
    setMinute(value);
  }, []);

  const handleMeridianChange = useCallback((value) => setMeridian(value), []);

  // Select options for AM/PM
  const meridianOptions = [
    { label: "AM", value: "AM" },
    { label: "PM", value: "PM" },
  ];

  const handleSubmit = async () => {
    setError("");
    setButtonPressed(true);

    let base64 = new_pin_data.product_image_base64
      .replaceAll("data:image/jpeg;base64,", "")
      .replaceAll("data:image/png;base64,", "")
      .replaceAll("data:text/html;base64,", "");
    let data = {
      title: new_pin_data.title,
      description: new_pin_data.description,
      board_id: new_pin_data.board_id,
      media_source: {
        source_type: "image_base64",
        content_type: "image/png",
        data: base64,
      },
    };

    try {
      pinterestFetcher.submit(
        { access_key: user?.accessToken, data: JSON.stringify(data) },
        { method: "post", action: "/api/pinterest/create_pin" }
      );
    } catch (error) {
      console.log(error.message);
    }
  };
  const handleSchedule = () => {
    setScheduleButtonPressed(true);

    if (errors.hour || errors.minute) {
      return;
    }

    // Create a Date object from the selected date and time
    const date = selectedDates.start;
    const scheduledTime = new Date(date);
    scheduledTime.setHours(
      meridian === "PM" && hour !== "12" ? parseInt(hour) + 12 : parseInt(hour)
    );
    scheduledTime.setMinutes(parseInt(minute));

    // Calculate delay in milliseconds
    const delay = scheduledTime.getTime() - Date.now();
    let data = {
      pin_data: new_pin_data,
      shopifyShopId: user?.shopifyShopId,
    };

    if (!delay) {
      setErrorToastActive(true);

      shopify.toast.show("Please select the right time!");
      return false;
    }
    if (delay < 0) {
      shopify.toast.show("Please select the right time!");
      return false;
    }
    SchedulePinFetcher.submit(
      {
        access_key: user?.accessToken,
        data: JSON.stringify(data),
        delay: delay,
      },
      { method: "post", action: "/api/pinterest/schedule_pin" }
    );
    shopify.modal.hide("schedule-modal");

    // if(pinterestFetcher.data){
    //   console.log(pinterestFetcher.data)
    //   setButtonPressed(false)
    // }
  };

  useEffect(() => {
    if (SchedulePinFetcher?.data) {
      setScheduleButtonPressed(false);
    }

    if (SchedulePinFetcher?.data?.jobID) {
      shopify.toast.show("Pin Scheduled Successfully!");
      shopify.modal.hide("schedule-modal");
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3",
          },
          edited_pin_base64: null,
        })
      );

      navigate("/app");
    }
  }, [SchedulePinFetcher.data]);

  const handleSaveToDraft = () => {
    setDraftButtonPressed(true);
    DraftPinFetcher.submit(
      {
        shopifyShopId: user?.shopifyShopId,
        product_id: new_pin_data?.product?.node?.id,
        product_title: new_pin_data?.product?.node?.title,
        status: "draft",
        pinterestJson: JSON.stringify({}),
        productEditJson: JSON.stringify(new_pin_data),
      },
      { method: "post", action: "/data/pins/save_draft" }
    );
  };

  useEffect(() => {
    if (DraftPinFetcher?.data) {
      setDraftButtonPressed(false);
    }
    if (DraftPinFetcher?.data?.id) {
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3",
          },
          edited_pin_base64: null,
        })
      );
      navigate("/app");
    }
  }, [DraftPinFetcher.data]);

  //
  useEffect(() => {
    console.log(pinterestFetcher?.data, "data===>");
    if (pinterestFetcher?.data?.status !== 200) {
      setError(pinterestFetcher?.data?.message);
      setButtonPressed(false);
    }
    setButtonPressed(false);
    if (pinterestFetcher?.data?.id) {
      storePinFetcher.submit(
        {
          shopifyShopId: user?.shopifyShopId,
          product_id: new_pin_data?.product?.id,
          pinterestJson: JSON.stringify(pinterestFetcher?.data),
          product_title: new_pin_data?.product?.node?.title,
          status: "published",
          productEditJson: JSON.stringify(new_pin_data),
        },
        { method: "post", action: "/data/pins/create" }
      );
    }
  }, [pinterestFetcher.data]);

  // check is pin created
  useEffect(() => {
    if (storePinFetcher?.data?.id) {
      // Show "Pin Created successfully!" immediately
      shopify.toast.show("Pin Created successfully!");

      // Reset form data and navigate after showing toasts
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3",
          },
          edited_pin_base64: null,
        })
      );

      // Navigate to view pins page
      navigate("/app/view_pins");
    }
  }, [storePinFetcher.data]);

  const shopify = useAppBridge();
  return (
    <div>
      <Page>
        <Page
          style={{ display: "block" }}
          title="Preview & Publish"
          // fullWidth
          subtitle="Review your pin and publish it directly to Pinterest with a single click."
          compactTitle
        >
          {scheduleToast}
          {ErrorToast}

          <Card>
            <div style={{ padding: "1.5rem", paddingRight: "0px" }}>
              <div
                style={{
                  width: "100%",
                  display: "flex",

                  overflow: "hidden",
                }}
              >
                {new_pin_data.edited_pin_base64 == null ? (
                  <div
                    style={{
                      background: "#E6E1D2",

                      padding: "30px",
                      width: "20%",
                      height: "400px",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100px",
                        background: "#C0B5B3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text as="h1" variant="heading2xl" fontWeight="bold">
                        Title
                      </Text>
                    </div>
                    <div style={{ width: "100%" }}>
                      <img
                        style={{ width: "100%", height: "100%" }}
                        src={new_pin_data?.product?.node?.featuredImage?.url}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "40%",
                    }}
                  >
                    <img
                      src={new_pin_data.edited_pin_base64}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
                {/* <div style={{
                            background:'#E6E1D2',
                 
                            padding: '30px',
                            width:'40%',
                            height: '400px'
                          }}>
                            <div style={{width:'100%',height:'100px',background:'#C0B5B3',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Text as="h1" variant="heading2xl" fontWeight="bold">Title</Text>
                            </div>
                            <div style={{width:'100%',}}>
                           
                              <img style={{width:'100%',height:'100%'}} src={new_pin_data.product.node.featuredImage.url}/>
                            </div>
                          </div> */}
                {/*  */}
                <div style={{ width: "60%", padding: "20px" }}>
                  <svg
                    style={{ width: "100%", display: "none" }}
                    width="353"
                    height="40"
                    viewBox="0 0 353 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.4998 21.3333C15.2332 21.3333 15.8332 21.9333 15.8332 22.6667V26.6667C15.8332 27.4 15.2332 28 14.4998 28H2.49984C1.7665 28 1.1665 27.4 1.1665 26.6667V22.6667C1.1665 21.9333 1.7665 21.3333 2.49984 21.3333C3.23317 21.3333 3.83317 21.9333 3.83317 22.6667V25.3333H13.1665V22.6667C13.1665 21.9333 13.7665 21.3333 14.4998 21.3333ZM6.37984 17.8933C5.85984 18.4133 5.01317 18.42 4.49317 17.8933C3.97317 17.3733 3.9665 16.5333 4.4865 16.0133L8.49317 12L12.5065 16.0067C13.0265 16.5267 13.0332 17.3733 12.5132 17.8933C11.9932 18.4133 11.1465 18.42 10.6265 17.8933L9.8265 17.1V21.22C9.8265 21.5736 9.68603 21.9128 9.43598 22.1628C9.18593 22.4129 8.84679 22.5533 8.49317 22.5533C8.13955 22.5533 7.80041 22.4129 7.55036 22.1628C7.30031 21.9128 7.15984 21.5736 7.15984 21.22V17.1067L6.37984 17.8933Z"
                      fill="#111111"
                    />
                    <g clip-path="url(#clip0_1_3587)">
                      <path
                        d="M44.5 18C43.3933 18 42.5 18.8933 42.5 20C42.5 21.1067 43.3933 22 44.5 22C45.6067 22 46.5 21.1067 46.5 20C46.5 18.8933 45.6067 18 44.5 18ZM38.5 18C39.6067 18 40.5 18.8933 40.5 20C40.5 21.1067 39.6067 22 38.5 22C37.3933 22 36.5 21.1067 36.5 20C36.5 18.8933 37.3933 18 38.5 18ZM50.5 18C51.6067 18 52.5 18.8933 52.5 20C52.5 21.1067 51.6067 22 50.5 22C49.3933 22 48.5 21.1067 48.5 20C48.5 18.8933 49.3933 18 50.5 18Z"
                        fill="#111111"
                      />
                    </g>
                    <path
                      d="M184.96 22.2734V20.6484H187.96C188.684 20.6484 189.247 20.4635 189.648 20.0938C190.049 19.7188 190.249 19.1927 190.249 18.5156V18.5C190.249 17.8177 190.049 17.2917 189.648 16.9219C189.247 16.5521 188.684 16.3672 187.96 16.3672H184.96V14.7266H188.452C189.218 14.7266 189.887 14.8828 190.46 15.1953C191.033 15.5078 191.481 15.9479 191.804 16.5156C192.127 17.0781 192.288 17.737 192.288 18.4922V18.5078C192.288 19.2578 192.127 19.9167 191.804 20.4844C191.481 21.0469 191.033 21.487 190.46 21.8047C189.887 22.1172 189.218 22.2734 188.452 22.2734H184.96ZM183.952 26V14.7266H185.968V26H183.952ZM194.07 26V14.1562H196.015V18.7734H196.148C196.351 18.3099 196.659 17.9479 197.07 17.6875C197.481 17.4271 197.994 17.2969 198.609 17.2969C199.244 17.2969 199.781 17.4219 200.218 17.6719C200.656 17.9167 200.987 18.276 201.211 18.75C201.44 19.224 201.554 19.7995 201.554 20.4766V26H199.609V20.9297C199.609 20.263 199.468 19.763 199.187 19.4297C198.911 19.0964 198.479 18.9297 197.89 18.9297C197.505 18.9297 197.172 19.0156 196.89 19.1875C196.609 19.3594 196.393 19.6016 196.242 19.9141C196.091 20.2266 196.015 20.5964 196.015 21.0234V26H194.07ZM207.219 26.1719C206.37 26.1719 205.638 25.9948 205.023 25.6406C204.409 25.2812 203.935 24.7708 203.602 24.1094C203.273 23.4479 203.109 22.6562 203.109 21.7344V21.7188C203.109 20.8073 203.276 20.0208 203.609 19.3594C203.943 18.6927 204.414 18.1823 205.023 17.8281C205.638 17.474 206.37 17.2969 207.219 17.2969C208.068 17.2969 208.797 17.474 209.406 17.8281C210.021 18.1823 210.495 18.6901 210.828 19.3516C211.161 20.013 211.328 20.8021 211.328 21.7188V21.7344C211.328 22.6562 211.161 23.4479 210.828 24.1094C210.5 24.7708 210.029 25.2812 209.414 25.6406C208.805 25.9948 208.073 26.1719 207.219 26.1719ZM207.219 24.5938C207.667 24.5938 208.047 24.4818 208.359 24.2578C208.677 24.0286 208.919 23.7031 209.086 23.2812C209.253 22.8542 209.336 22.3411 209.336 21.7422V21.7266C209.336 21.1224 209.253 20.6094 209.086 20.1875C208.919 19.7604 208.677 19.4349 208.359 19.2109C208.047 18.9818 207.667 18.8672 207.219 18.8672C206.771 18.8672 206.388 18.9818 206.07 19.2109C205.753 19.4349 205.51 19.7604 205.344 20.1875C205.177 20.6094 205.094 21.1224 205.094 21.7266V21.7422C205.094 22.3411 205.177 22.8542 205.344 23.2812C205.51 23.7083 205.75 24.0339 206.062 24.2578C206.38 24.4818 206.766 24.5938 207.219 24.5938ZM216.321 26.0391C215.341 26.0391 214.636 25.8594 214.203 25.5C213.771 25.1406 213.555 24.5521 213.555 23.7344V18.9688H212.227V17.4609H213.555V15.3672H215.532V17.4609H217.328V18.9688H215.532V23.2734C215.532 23.6953 215.62 24.0052 215.797 24.2031C215.979 24.3958 216.271 24.4922 216.672 24.4922C216.813 24.4922 216.927 24.4896 217.016 24.4844C217.11 24.474 217.214 24.4635 217.328 24.4531V25.9531C217.193 25.9792 217.037 26 216.86 26.0156C216.688 26.0312 216.508 26.0391 216.321 26.0391ZM222.563 26.1719C221.714 26.1719 220.982 25.9948 220.368 25.6406C219.753 25.2812 219.279 24.7708 218.946 24.1094C218.618 23.4479 218.454 22.6562 218.454 21.7344V21.7188C218.454 20.8073 218.62 20.0208 218.954 19.3594C219.287 18.6927 219.758 18.1823 220.368 17.8281C220.982 17.474 221.714 17.2969 222.563 17.2969C223.412 17.2969 224.141 17.474 224.751 17.8281C225.365 18.1823 225.839 18.6901 226.173 19.3516C226.506 20.013 226.673 20.8021 226.673 21.7188V21.7344C226.673 22.6562 226.506 23.4479 226.173 24.1094C225.844 24.7708 225.373 25.2812 224.758 25.6406C224.149 25.9948 223.417 26.1719 222.563 26.1719ZM222.563 24.5938C223.011 24.5938 223.391 24.4818 223.704 24.2578C224.021 24.0286 224.264 23.7031 224.43 23.2812C224.597 22.8542 224.68 22.3411 224.68 21.7422V21.7266C224.68 21.1224 224.597 20.6094 224.43 20.1875C224.264 19.7604 224.021 19.4349 223.704 19.2109C223.391 18.9818 223.011 18.8672 222.563 18.8672C222.115 18.8672 221.732 18.9818 221.415 19.2109C221.097 19.4349 220.855 19.7604 220.688 20.1875C220.521 20.6094 220.438 21.1224 220.438 21.7266V21.7422C220.438 22.3411 220.521 22.8542 220.688 23.2812C220.855 23.7083 221.094 24.0339 221.407 24.2578C221.725 24.4818 222.11 24.5938 222.563 24.5938Z"
                      fill="#5F5F5F"
                    />
                    <g clip-path="url(#clip1_1_3587)">
                      <path
                        d="M241.5 23.75L235.83 18.145C235.39 17.715 235.39 17.01 235.83 16.575C236.27 16.14 236.98 16.14 237.42 16.575L241.5 20.605L245.58 16.575C246.02 16.14 246.73 16.14 247.17 16.575C247.61 17.01 247.61 17.715 247.17 18.145L241.5 23.75Z"
                        fill="#5F5F5F"
                      />
                    </g>
                    <rect
                      x="283.5"
                      y="4"
                      width="69"
                      height="32"
                      rx="16"
                      fill="#E60023"
                    />
                    <path
                      d="M304.964 26.2812C304.089 26.2812 303.329 26.1458 302.683 25.875C302.042 25.6042 301.537 25.2266 301.167 24.7422C300.798 24.2578 300.589 23.6927 300.542 23.0469L300.535 22.9375H302.488L302.496 23.0156C302.527 23.3333 302.652 23.6094 302.871 23.8438C303.095 24.0781 303.391 24.263 303.761 24.3984C304.131 24.5286 304.553 24.5938 305.027 24.5938C305.48 24.5938 305.881 24.5234 306.23 24.3828C306.579 24.2422 306.852 24.0495 307.05 23.8047C307.248 23.5547 307.347 23.2682 307.347 22.9453V22.9375C307.347 22.5312 307.188 22.2005 306.871 21.9453C306.553 21.6849 306.029 21.4766 305.3 21.3203L304.089 21.0703C302.933 20.8255 302.092 20.4349 301.566 19.8984C301.045 19.3568 300.785 18.6667 300.785 17.8281V17.8203C300.785 17.1484 300.962 16.5599 301.316 16.0547C301.675 15.5495 302.167 15.1562 302.792 14.875C303.423 14.5885 304.144 14.4453 304.957 14.4453C305.79 14.4453 306.511 14.5859 307.121 14.8672C307.73 15.1432 308.209 15.5208 308.558 16C308.907 16.4792 309.102 17.0208 309.144 17.625L309.152 17.7266H307.23L307.214 17.6328C307.167 17.3359 307.045 17.0781 306.847 16.8594C306.654 16.6354 306.397 16.4583 306.074 16.3281C305.751 16.1979 305.373 16.1328 304.941 16.1328C304.529 16.1328 304.162 16.1979 303.839 16.3281C303.516 16.4531 303.261 16.6302 303.074 16.8594C302.891 17.0885 302.8 17.3646 302.8 17.6875V17.6953C302.8 18.0911 302.954 18.4193 303.261 18.6797C303.574 18.9401 304.082 19.1432 304.785 19.2891L305.996 19.5469C306.787 19.7135 307.431 19.9349 307.925 20.2109C308.42 20.487 308.782 20.8307 309.011 21.2422C309.246 21.6484 309.363 22.138 309.363 22.7109V22.7188C309.363 23.4479 309.183 24.0781 308.824 24.6094C308.47 25.1406 307.962 25.5521 307.3 25.8438C306.644 26.1354 305.865 26.2812 304.964 26.2812ZM313.355 26.1406C312.819 26.1406 312.337 26.0365 311.91 25.8281C311.488 25.6198 311.155 25.3255 310.91 24.9453C310.67 24.5599 310.551 24.1068 310.551 23.5859V23.5703C310.551 23.0651 310.676 22.6302 310.926 22.2656C311.176 21.8958 311.543 21.6068 312.027 21.3984C312.512 21.1901 313.1 21.0677 313.793 21.0312L316.949 20.8359V22.1172L314.066 22.3047C313.519 22.3359 313.116 22.4505 312.855 22.6484C312.595 22.8464 312.465 23.1224 312.465 23.4766V23.4922C312.465 23.8568 312.603 24.1406 312.879 24.3438C313.16 24.5469 313.517 24.6484 313.949 24.6484C314.34 24.6484 314.689 24.5703 314.996 24.4141C315.303 24.2578 315.545 24.0469 315.722 23.7812C315.9 23.5104 315.988 23.2057 315.988 22.8672V20.1641C315.988 19.737 315.853 19.4115 315.582 19.1875C315.311 18.9583 314.91 18.8438 314.379 18.8438C313.936 18.8438 313.574 18.9219 313.293 19.0781C313.012 19.2292 312.821 19.4453 312.722 19.7266L312.715 19.7578H310.879L310.887 19.6875C310.949 19.2083 311.137 18.7891 311.449 18.4297C311.762 18.0703 312.176 17.7917 312.691 17.5938C313.207 17.3958 313.801 17.2969 314.472 17.2969C315.212 17.2969 315.837 17.4115 316.347 17.6406C316.858 17.8646 317.246 18.1927 317.512 18.625C317.777 19.0521 317.91 19.5651 317.91 20.1641V26H315.988V24.8281H315.855C315.699 25.099 315.496 25.3333 315.246 25.5312C315.001 25.7292 314.72 25.8802 314.402 25.9844C314.084 26.0885 313.736 26.1406 313.355 26.1406ZM321.957 26L318.918 17.4609H320.996L322.965 24.1016H323.106L325.067 17.4609H327.113L324.082 26H321.957ZM331.747 26.1719C330.898 26.1719 330.168 25.9922 329.559 25.6328C328.955 25.2734 328.489 24.763 328.161 24.1016C327.833 23.4401 327.668 22.6562 327.668 21.75V21.7422C327.668 20.8464 327.83 20.0651 328.153 19.3984C328.481 18.7318 328.944 18.2161 329.543 17.8516C330.142 17.4818 330.846 17.2969 331.653 17.2969C332.465 17.2969 333.163 17.4766 333.747 17.8359C334.335 18.1901 334.788 18.6875 335.106 19.3281C335.424 19.9688 335.583 20.7188 335.583 21.5781V22.2188H328.645V20.9141H334.629L333.708 22.1328V21.3594C333.708 20.7917 333.622 20.3203 333.45 19.9453C333.278 19.5703 333.038 19.2891 332.731 19.1016C332.429 18.9141 332.077 18.8203 331.676 18.8203C331.275 18.8203 330.918 18.9193 330.606 19.1172C330.299 19.3099 330.054 19.5964 329.872 19.9766C329.694 20.3516 329.606 20.8125 329.606 21.3594V22.1406C329.606 22.6667 329.694 23.1172 329.872 23.4922C330.049 23.862 330.299 24.1484 330.622 24.3516C330.95 24.5495 331.338 24.6484 331.786 24.6484C332.135 24.6484 332.434 24.599 332.684 24.5C332.939 24.3958 333.145 24.2734 333.301 24.1328C333.458 23.987 333.567 23.849 333.629 23.7188L333.653 23.6641H335.497L335.481 23.7344C335.413 24.0104 335.288 24.2917 335.106 24.5781C334.929 24.8594 334.687 25.1224 334.379 25.3672C334.077 25.6068 333.708 25.8021 333.27 25.9531C332.833 26.099 332.325 26.1719 331.747 26.1719Z"
                      fill="white"
                    />
                    <defs>
                      <clipPath id="clip0_1_3587">
                        <rect
                          width="16"
                          height="16"
                          fill="white"
                          transform="translate(36.5 12)"
                        />
                      </clipPath>
                      <clipPath id="clip1_1_3587">
                        <rect
                          width="12"
                          height="12"
                          fill="white"
                          transform="translate(235.5 14)"
                        />
                      </clipPath>
                    </defs>
                  </svg>

                  <div>
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          width: "80%",
                          display: "block",
                          textDecoration: "underline",
                        }}
                      >
                        {new_pin_data.destination_url}
                      </span>
                    </div>
                    {/*  */}
                    <div>
                      <h3
                        style={{
                          fontSize: "30px",
                          fontWeight: "500",
                          fontFamily: "Inter",
                          marginTop: "15px",
                          marginBottom: "20px",
                          color: "#000000",
                        }}
                      >
                        {new_pin_data.title}
                      </h3>
                    </div>

                    <div>
                      <h3>{new_pin_data.description}</h3>
                    </div>
                  </div>
                </div>
              </div>
              {error && <span style={{ color: "red" }}>{error}</span>}
            </div>
            <div
              style={{
                marginTop: "30px",
                display: "flex",
                gap: "15px",
                justifyContent: "center",
              }}
            >
              <Button
                to="select_product"
                style={{
                  ...styles.theme_button_light,
                  border: "1px solid #d82c16",
                }}
                type="button"
                onClick={() => {
                  navigate("/app/create_pin");
                }}
              >
                Back to edit
              </Button>
              {/*  */}
              <Button
                to="select_product"
                style={{
                  ...styles.theme_button_light,
                  border: "1px solid #d82c16",
                }}
                type="button"
                onClick={() => {
                  handleSaveToDraft();
                }}
                loading={draftButtonPressed}
              >
                Save to draft
              </Button>
              {/*  */}
              <Button
                to="select_product"
                style={{
                  ...styles.theme_button_light,
                  border: "1px solid #d82c16",
                }}
                type="button"
                onClick={() => {
                  //handleSchedule()
                  shopify.modal.show("schedule-modal");
                }}
              >
                Schedule
              </Button>
              {/*  */}
              <Button
                to="select_product"
                style={{
                  ...styles.theme_button,
                  background: buttonPressed ? "gray" : "rgba(215, 44, 13, 1)",
                }}
                loading={buttonPressed}
                type="button"
                onClick={() => {
                  handleSubmit();
                }}
              >
                Public Pin
              </Button>
            </div>
          </Card>
        </Page>

        <Modal id="schedule-modal">
          <div
            style={{
              padding: "20px",
            }}
          >
            <DatePicker
              month={selectedDates.start.getMonth()}
              year={selectedDates.start.getFullYear()}
              onChange={handleDateChange}
              selected={selectedDates}
              allowRange={false} // Only select a single date
            />
            {/* Hour, Minute, and AM/PM Select */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginTop: "16px",
                justifyContent: "center",
              }}
            >
              {/* Hour Input */}
              <TextField
                label="Hour"
                type="number"
                value={hour}
                onChange={handleHourChange}
                min={1}
                max={12}
                error={errors.hour}
                autoComplete="off"
                defaultValue={"1"}
              />

              {/* Minute Input */}
              <TextField
                label="Minute"
                type="number"
                value={minute}
                onChange={handleMinuteChange}
                min={0}
                max={59}
                error={errors.minute}
                autoComplete="off"
                defaultValue={"00"}
              />

              {/* AM/PM Select */}
              <Select
                label="AM/PM"
                options={meridianOptions}
                onChange={handleMeridianChange}
                value={meridian}
              />
            </div>

            {/* Display validation error message */}
            {(errors.hour || errors.minute) && (
              <Banner title="Validation Error" status="critical">
                <p>Please fix the following errors:</p>
                {errors.hour && <p>{errors.hour}</p>}
                {errors.minute && <p>{errors.minute}</p>}
              </Banner>
            )}
          </div>

          <TitleBar title="Schedule Pin">
            <button
              variant="primary"
              onClick={() => {
                handleSchedule();
              }}
              loading={scheduleButtonPressed}
            >
              Submit
            </button>
            <button
              onClick={() => {
                shopify.modal.hide("schedule-modal");
              }}
            >
              Cancel
            </button>
          </TitleBar>
        </Modal>
      </Page>
    </div>
  );
}
