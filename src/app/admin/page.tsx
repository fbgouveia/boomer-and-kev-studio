import React from 'react';
import { StoryboardView } from '@/components/admin/StoryboardView';

export const metadata = {
  title: 'B&K Admin | 2026 Production',
};

export default function AdminDashboard() {
  return (
    <main className="bg-[#09090B] min-h-screen">
      <nav className="border-b-4 border-[#DFE104] p-6 flex justify-between items-center bg-[#09090B]">
        <div className="text-3xl font-black text-[#FAFAFA] font-['Space_Grotesk'] tracking-tighter uppercase">
          BOOMER & KEV <span className="text-[#DFE104]">STUDIO</span>
        </div>
        <div className="flex gap-4">
          <div className="text-[#DFE104] font-bold uppercase text-sm border-2 border-[#DFE104] px-3 py-1">
            KLING API: READY
          </div>
          <div className="text-[#FAFAFA] font-bold uppercase text-sm border-2 border-[#3F3F46] px-3 py-1">
            v2026.1
          </div>
        </div>
      </nav>
      <StoryboardView />
    </main>
  );
}
