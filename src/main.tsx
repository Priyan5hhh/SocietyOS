import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ImageKitProvider } from '@imagekit/react'
import './index.css'
import App from './App.tsx'

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string | undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      <App />
    </ImageKitProvider>
  </StrictMode>,
)
