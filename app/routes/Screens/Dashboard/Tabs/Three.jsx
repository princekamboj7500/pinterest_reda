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
  TextField,
  Form,
  InlineStack,
  LegacyCard, DataTable
} from "@shopify/polaris";
import styles from '../../../styles'
import { Link } from '@remix-run/react'
import {Select} from '@shopify/polaris';

export default function Three(props){
    const options = [
        {label: 'Choose The Product', value: 'today'},
        {label: 'Yesterday', value: 'yesterday'},
        {label: 'Last 7 days', value: 'lastWeek'},
    ];
    
    const [newsletter, setNewsletter] = useState(false);
    const [email, setEmail] = useState('');

    const handleSubmit = useCallback(() => {
        setEmail('');
        setNewsletter(false);
    }, []);

    const [selected, setSelected] = useState('today');

    const handleSelectChange = useCallback((value) => setSelected(value),
        [],
    );
    const handleEmailChange = useCallback((value) => setEmail(value), []);
    return <Card >
                <Form onSubmit={handleSubmit}>
                    <div style={{padding:'1.5rem'}}>
                        <Text as="h2" variant="headingLg">
                            Create PIN
                        </Text>
                        <div style={{marginTop : '20px'}}>
                            <svg width="236" height="4" viewBox="0 0 236 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="50" height="4" rx="2" fill="#D9D9D9"/>
                                <rect x="62" width="50" height="4" rx="2" fill="#D72C0D"/>
                                <rect x="124" width="50" height="4" rx="2" fill="#D9D9D9"/>
                                <rect x="186" width="50" height="4" rx="2" fill="#D9D9D9"/>
                            </svg>
                        </div>
                        
                        <div style={{marginTop : '30px'}} >
                            <TextField
                                value={email}
                                onChange={handleEmailChange}
                                label="PIN Title"
                                type="email"
                                placeholder="Enter the title"
                                autoComplete="email"
                                helpText={
                                    <span>
                                     The title of the pin is visible to the public on Pinterest and must be attractive and relevant to encourage interactions and clicks.
                                    </span>
                                }
                            />
                        </div>
                        <div style={{marginTop : '15px'}} >
                            <TextField
                                value={email}
                                onChange={handleEmailChange}
                                label="Description"
                                type="email"
                                autoComplete="email"
                                multiline={5}
                                helpText={
                                    <span>
                                     A well-written description will help attract users' interest and provide additional details about the product, encouraging interactions with the pin.
                                    </span>
                                }
                            />
                        </div>

                        <div style={{marginTop : '15px'}} >
                            <TextField
                                value={email}
                                onChange={handleEmailChange}
                                label="Destination URL"
                                type="email"
                                autoComplete="email"
                                placeholder="Enter the URL"
                                helpText={
                                    <span>
                                     Your destination URL will direct users who click on your pin directly to your product page, increasing traffic and potentially sales.
                                    </span>
                                }
                            />
                        </div>
                       
                        <div style={{marginTop : '30px'}} >
                            <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                                props.set_get_started_tab(4)
                            }}>
                                Next
                            </button>
                        </div>
                    </div>
                </Form>
            </Card>
}
