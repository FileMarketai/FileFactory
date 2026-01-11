import Sidebar from '@/components/ui/Admin/AdminSidebar'

import { ReactNode } from 'react';

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex bg-white dark:bg-slate-900 text-black dark:text-white">
      <Sidebar />
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

export default layout