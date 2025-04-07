import { useEffect, useState } from "react";
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

export default function One(props){
    
    return <Card >
                <div style={{padding:'1.5rem'}}>
                    <Text as="h2" variant="headingLg">
                        Your welcome!
                    </Text>
                    <div style={{marginTop : '20px'}}>
                        <Text as="p" variant="" >
                        Now you can create your first Pinterest pin. In just a few simple steps, you'll be able to promote your Shopify store products to millions of users.
                        </Text>
                    </div>
                    <div style={{marginTop : '30px'}} >
                        <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                            props.set_get_started_tab(2)
                        }}>
                            Get started now
                        </button>
                    </div>
                </div>
                
            </Card>
}
