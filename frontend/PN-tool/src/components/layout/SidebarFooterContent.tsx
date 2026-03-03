import { ReactNode } from 'react';
import { UserAvatar } from './UserAvatar';
import { TooltipProvider } from '@/components/ui/tooltip';

interface SidebarFooterContentProps {
  collapsed: boolean;
  shortName: string;
  onProfileClick: () => void;
  helpComponent: ReactNode;
}

export function SidebarFooterContent({
  collapsed,
  shortName,
  onProfileClick,
  helpComponent,
}: SidebarFooterContentProps) {
  return (
    <TooltipProvider>
      <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
        {/* Avatar */}
        <UserAvatar shortName={shortName} onClick={onProfileClick} />

        {/* Help Documentation */}
        {helpComponent}
      </div>
    </TooltipProvider>
  );
}
