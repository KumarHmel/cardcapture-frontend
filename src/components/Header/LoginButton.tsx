//import React from 'react'

export default function LoginButton() {
  const launcherUrl = import.meta.env.VITE_AZURE_LAUNCHER_URL;
  return (
   <>
   <a href={launcherUrl}>
     <button>Login</button>
   </a>
   </>
  )
}
