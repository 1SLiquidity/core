import { ModalProvider } from '@/app/lib/context/modalContext'
import { SidebarProvider } from '@/app/lib/context/sidebarContext'
import { ToastProvider } from '@/app/lib/context/toastProvider'
import { ReservePrefetchProvider } from '@/app/providers'

export const HomeProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ModalProvider>
      <SidebarProvider>
        <ToastProvider>
          <ReservePrefetchProvider>{children}</ReservePrefetchProvider>
        </ToastProvider>
      </SidebarProvider>
    </ModalProvider>
  )
}
