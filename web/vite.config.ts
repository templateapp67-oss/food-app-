import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({plugins:[tailwindcss()],root:'web',envDir:'..',build:{outDir:'../dist',emptyOutDir:true}});
