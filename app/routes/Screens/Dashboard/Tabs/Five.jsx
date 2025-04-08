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

export default function Five(props){
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
                        Select Product 
                    </Text>
                    <div style={{marginTop : '20px'}}>
                        <svg width="236" height="4" viewBox="0 0 236 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="62" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="124" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="186" width="50" height="4" rx="2" fill="#D72C0D"/>
                        </svg>

                    </div>
                    
                  
                    <div style={{marginTop : '30px'}}>
                        <Text as="p" variant="bodyMd" tone="subdued" >
                            The preview lets you see exactly how your pin will look in your Pinterest feed. Make sure your title, image, and description are correctly displayed and attractive to grab users' attention. If you notice something you want to change, you can go back to editing for quick adjustments.
                        </Text>
                    </div>
                    <div style={{marginTop : '30px'}}>
                        <Text as="p" variant="bodyMd" tone="subdued" >
                            Once you're happy with the look of your pin, hit "Public PIN" to make it visible on Pinterest. The Pin will be shown to the selected audience based on the categories and keywords chosen.
                        </Text>
                    </div>
                    <div style={{marginTop : '30px'}} >
                        <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                            props.set_get_started_tab(5)
                        }}>
                            Public PIN
                        </button>
                    </div>
                </div>
                
            </Card>
}
