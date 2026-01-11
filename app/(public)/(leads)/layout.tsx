import Sidebar from '@/components/ui/Leads/LeadSidebar'

import { ReactNode } from 'react';

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex bg-white dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

export default layout