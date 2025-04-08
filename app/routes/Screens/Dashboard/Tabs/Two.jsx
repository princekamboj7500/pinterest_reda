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

export default function Two(props){
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
                            <rect width="50" height="4" rx="2" fill="#D72C0D"/>
                            <rect x="62" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="124" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            <rect x="186" width="50" height="4" rx="2" fill="#D9D9D9"/>
                        </svg>
                    </div>
                    
                    <div style={{marginTop : '30px'}} >
                        <Select
                            label=""
                            options={options}
                            onChange={handleSelectChange}
                            value={selected}
                        />
                    </div>
                    <div style={{marginTop : '5px'}}>
                        <Text as="p" variant="bodyMd" tone="subdued" >
                            This step allows the user to select the product from the Shopify store that will be promoted through the Pinterest pin. 
                        </Text>
                    </div>
                    <div style={{marginTop : '30px'}} >
                        <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                            props.set_get_started_tab(3)
                        }}>
                            Next
                        </button>
                    </div>
                </div>
                
            </Card>
}
