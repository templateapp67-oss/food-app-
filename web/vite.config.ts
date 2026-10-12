import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({plugins:[tailwindcss()],root:'web',envDir:'..',server:{host:'0.0.0.0',port:3000,allowedHosts:true},build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{input:{index:'web/index.html','firebase-messaging-sw':'web/src/firebase-messaging-sw.ts'},output:{entryFileNames:chunk=>chunk.name==='firebase-messaging-sw'?'firebase-messaging-sw.js':'assets/[name]-[hash].js'}}}});
