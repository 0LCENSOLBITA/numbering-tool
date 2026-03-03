import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UserAvatarProps {
  shortName: string;
  onClick: () => void;
}

export function UserAvatar({ shortName, onClick }: UserAvatarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
        >
           <Avatar className="h-9 w-9 cursor-pointer transition-shadow duration-200 hover:ring-2 hover:ring-white/70">
             <AvatarFallback className="bg-white text-black text-sm font-bold">
               {shortName || '?'}
            </AvatarFallback>
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>My Profile</p>
      </TooltipContent>
    </Tooltip>
  );
}
