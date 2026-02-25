"use client" // use only on the client side not server side

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes" 

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    const [mounted, setMounted]= React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return (
        mounted && <NextThemesProvider {...props}>{children}</NextThemesProvider>
    )
}