'use client';
import { useEffect } from 'react';
export default function LegacyViewingLink(){
  useEffect(()=>{if(window.location.hash)window.location.replace('/viewing'+window.location.hash);},[]);
  return <main style={{maxWidth:520,margin:'80px auto',padding:28,fontFamily:'Arial,sans-serif'}}><h1>Your booking link has changed</h1><p>Please ask your agent for a new viewing link. You can then confirm, cancel or request another slot.</p><p>Your appointment has not been cancelled by opening this page.</p></main>;
}
