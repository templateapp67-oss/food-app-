import {useEffect,useState} from 'react';
export default function AppUpdate(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{if(!('serviceWorker' in navigator))return;let previous=!!navigator.serviceWorker.controller;const changed=()=>{if(previous)setReady(true);previous=true};navigator.serviceWorker.addEventListener('controllerchange',changed);return()=>navigator.serviceWorker.removeEventListener('controllerchange',changed)},[]);
 if(!ready)return null;
 return <aside className="notice" role="status">A new Nexora Food version is ready. <button className="secondary" onClick={()=>location.reload()}>Update app</button></aside>;
}
