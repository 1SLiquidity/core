import { ModalProvider } from '@/app/lib/context/modalContext';
import { SidebarProvider } from '@/app/lib/context/sidebarContext';
import { ToastProvider } from '@/app/lib/context/toastProvider';

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ModalProvider>
      <SidebarProvider>
        <ToastProvider>{children}</ToastProvider>
      </SidebarProvider>
    </ModalProvider>
  );
};

export default HomeLayout;
