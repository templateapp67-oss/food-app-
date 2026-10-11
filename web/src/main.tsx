import React from 'react';import{createRoot}from'react-dom/client';import App from './App';import './style.css';
class Boundary extends React.Component<{children:React.ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return{error:true}}render(){return this.state.error?<main className="fatal"><h1>Something went wrong.</h1><p>Reload to restore your saved cart.</p><button onClick={()=>location.reload()}>Reload</button></main>:this.props.children}}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><App/></Boundary></React.StrictMode>);

if('serviceWorker'in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{/* Install help remains available when service workers are blocked. */})});
