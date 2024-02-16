import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';

export default function HRAgentLogo() {
  return (
      <div className={`${lusitana.className} flex flex-row items-center leading-none text-white`} 
          style={{ whiteSpace: 'nowrap' }}>
        {/* <GlobeAltIcon className="h-12 w-12 rotate-[15deg]" /> */}
        <p className="text-[36px]">HR-Agent</p>
      </div>
  );
}
