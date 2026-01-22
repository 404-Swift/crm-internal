import { useEffect, useState } from "react"
import { Toast } from "./toast"

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let toasts: ToastData[] = []
let listeners: Array<(toasts: ToastData[]) => void> = []

export const toast = {
  show: (toastData: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    toasts = [...toasts, { ...toastData, id }]
    listeners.forEach((listener) => listener(toasts))

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
      listeners.forEach((listener) => listener(toasts))
    }, 5000)
  },
  success: (title: string, description?: string) => {
    toast.show({ title, description, variant: "default" })
  },
  error: (title: string, description?: string) => {
    toast.show({ title, description, variant: "destructive" })
  },
}

export function Toaster() {
  const [toastList, setToastList] = useState<ToastData[]>([])

  useEffect(() => {
    listeners.push(setToastList)
    return () => {
      listeners = listeners.filter((l) => l !== setToastList)
    }
  }, [])

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toastList.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}
