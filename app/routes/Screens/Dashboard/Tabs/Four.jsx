import { useCallback, useEffect, useState } from "react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,

  InlineStack,
  LegacyCard, DataTable
} from "@shopify/polaris";
import styles from '../../../styles'
import { Link } from '@remix-run/react'
import {Select} from '@shopify/polaris';

export default function Four(props){
    const options = [
        {label: 'Choose The Product', value: 'today'},
        {label: 'Yesterday', value: 'yesterday'},
        {label: 'Last 7 days', value: 'lastWeek'},
    ];
    const [selected, setSelected] = useState('today');

    const handleSelectChange = useCallback((value) => setSelected(value),
        [],
    );

    return <Card >
                <div style={{padding:'1.5rem'}}>
                    <Text as="h2" variant="headingLg">
                        Edit PIN
                    </Text>
                    <div style={{marginTop : '20px'}}>
                        <svg width="236" height="4" viewBox="0 0 236 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="62" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="124" width="50" height="4" rx="2" fill="#D72C0D"/>
                            <rect x="186" width="50" height="4" rx="2" fill="#D9D9D9"/>
                        </svg>      

                    </div>
                    <div style={{marginTop : '30px'}}>
                        <Text as="p" variant="" >
                            If you're happy with the generated pin, you can skip this option and go straight to preview and publish. However, if you want to make changes, use the following editing tools.
                        </Text>
                    </div>

                    
                    <div style={{marginTop : '30px'}} >
                        <ul style={{listStyle:'none',padding:'0px'}}>
                            <li style={{...styles.create_checklist_ul_li ,display:'flex',alignItems: 'center'}}>
                                <span style={{marginRight:'15px',display:'flex'}}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.7244 7.62426C12.9587 7.38995 12.9587 7.01005 12.7244 6.77573C12.49 6.54142 12.1101 6.54142 11.8758 6.77573L8.1001 10.5515L6.42436 8.87573C6.19005 8.64142 5.81015 8.64142 5.57583 8.87573C5.34152 9.11005 5.34152 9.48995 5.57583 9.72426L7.67583 11.8243C7.91015 12.0586 8.29005 12.0586 8.52436 11.8243L12.7244 7.62426Z" fill="#4A4A4A"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4001 9C17.4001 13.6392 13.6393 17.4 9.0001 17.4C4.36091 17.4 0.600098 13.6392 0.600098 9C0.600098 4.36081 4.36091 0.599998 9.0001 0.599998C13.6393 0.599998 17.4001 4.36081 17.4001 9ZM16.2001 9C16.2001 12.9764 12.9765 16.2 9.0001 16.2C5.02365 16.2 1.8001 12.9764 1.8001 9C1.8001 5.02355 5.02365 1.8 9.0001 1.8C12.9765 1.8 16.2001 5.02355 16.2001 9Z" fill="#4A4A4A"/>
                                    </svg>
                                </span>
                                Editing and Stylizing Text
                            </li>
                            {/*  */}
                            <li style={{...styles.create_checklist_ul_li ,display:'flex',alignItems: 'center'}}>
                                <span style={{marginRight:'15px',display:'flex'}}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.7244 7.62426C12.9587 7.38995 12.9587 7.01005 12.7244 6.77573C12.49 6.54142 12.1101 6.54142 11.8758 6.77573L8.1001 10.5515L6.42436 8.87573C6.19005 8.64142 5.81015 8.64142 5.57583 8.87573C5.34152 9.11005 5.34152 9.48995 5.57583 9.72426L7.67583 11.8243C7.91015 12.0586 8.29005 12.0586 8.52436 11.8243L12.7244 7.62426Z" fill="#4A4A4A"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4001 9C17.4001 13.6392 13.6393 17.4 9.0001 17.4C4.36091 17.4 0.600098 13.6392 0.600098 9C0.600098 4.36081 4.36091 0.599998 9.0001 0.599998C13.6393 0.599998 17.4001 4.36081 17.4001 9ZM16.2001 9C16.2001 12.9764 12.9765 16.2 9.0001 16.2C5.02365 16.2 1.8001 12.9764 1.8001 9C1.8001 5.02355 5.02365 1.8 9.0001 1.8C12.9765 1.8 16.2001 5.02355 16.2001 9Z" fill="#4A4A4A"/>
                                    </svg>
                                </span>
                                Add Text
                            </li>
                            {/*  */}
                            <li style={{...styles.create_checklist_ul_li ,display:'flex',alignItems: 'center'}}>
                                <span style={{marginRight:'15px',display:'flex'}}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.7244 7.62426C12.9587 7.38995 12.9587 7.01005 12.7244 6.77573C12.49 6.54142 12.1101 6.54142 11.8758 6.77573L8.1001 10.5515L6.42436 8.87573C6.19005 8.64142 5.81015 8.64142 5.57583 8.87573C5.34152 9.11005 5.34152 9.48995 5.57583 9.72426L7.67583 11.8243C7.91015 12.0586 8.29005 12.0586 8.52436 11.8243L12.7244 7.62426Z" fill="#4A4A4A"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4001 9C17.4001 13.6392 13.6393 17.4 9.0001 17.4C4.36091 17.4 0.600098 13.6392 0.600098 9C0.600098 4.36081 4.36091 0.599998 9.0001 0.599998C13.6393 0.599998 17.4001 4.36081 17.4001 9ZM16.2001 9C16.2001 12.9764 12.9765 16.2 9.0001 16.2C5.02365 16.2 1.8001 12.9764 1.8001 9C1.8001 5.02355 5.02365 1.8 9.0001 1.8C12.9765 1.8 16.2001 5.02355 16.2001 9Z" fill="#4A4A4A"/>
                                    </svg>
                                </span>
                                Change Colors
                            </li>
                            {/*  */}
                            <li style={{...styles.create_checklist_ul_li ,display:'flex',alignItems: 'center'}}>
                                <span style={{marginRight:'15px',display:'flex'}}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.7244 7.62426C12.9587 7.38995 12.9587 7.01005 12.7244 6.77573C12.49 6.54142 12.1101 6.54142 11.8758 6.77573L8.1001 10.5515L6.42436 8.87573C6.19005 8.64142 5.81015 8.64142 5.57583 8.87573C5.34152 9.11005 5.34152 9.48995 5.57583 9.72426L7.67583 11.8243C7.91015 12.0586 8.29005 12.0586 8.52436 11.8243L12.7244 7.62426Z" fill="#4A4A4A"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4001 9C17.4001 13.6392 13.6393 17.4 9.0001 17.4C4.36091 17.4 0.600098 13.6392 0.600098 9C0.600098 4.36081 4.36091 0.599998 9.0001 0.599998C13.6393 0.599998 17.4001 4.36081 17.4001 9ZM16.2001 9C16.2001 12.9764 12.9765 16.2 9.0001 16.2C5.02365 16.2 1.8001 12.9764 1.8001 9C1.8001 5.02355 5.02365 1.8 9.0001 1.8C12.9765 1.8 16.2001 5.02355 16.2001 9Z" fill="#4A4A4A"/>
                                    </svg>
                                </span>
                                Resize Pictures and Items
                            </li>
                          
                        </ul>
                       
                    </div>
                   
                    <div style={{marginTop : '30px',display:'flex',gap:'15px'}} >
                        <button to="select_product"  style={{...styles.theme_button_light,border:'1px solid #d82c16'}} type="button" onClick={()=>{
                            props.set_get_started_tab(1)
                        }}>
                            Cancel
                        </button>
                        <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                            props.set_get_started_tab(5)
                        }}>
                            Save
                        </button>
                    </div>
                </div>
                
            </Card>
}
