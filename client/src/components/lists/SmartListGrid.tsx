import { Calendar, CalendarDays, Flag, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SmartListProps {
  todayCount: number;
  scheduledCount: number;
  allCount: number;
  flaggedCount: number;
}

const smartLists = [
  { key: 'today', label: '今天', icon: Calendar, color: 'bg-blue-500' },
  { key: 'scheduled', label: '已排程', icon: CalendarDays, color: 'bg-orange-500' },
  { key: 'all', label: '全部', icon: Inbox, color: 'bg-purple-500' },
  { key: 'flagged', label: '已標記', icon: Flag, color: 'bg-red-500' },
] as const;

export default function SmartListGrid({
  todayCount,
  scheduledCount,
  allCount,
  flaggedCount,
}: SmartListProps) {
  const navigate = useNavigate();
  const counts: Record<string, number> = {
    today: todayCount,
    scheduled: scheduledCount,
    all: allCount,
    flagged: flaggedCount,
  };

  return (
    <div className="mb-6 grid grid-cols-2 gap-3">
      {smartLists.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className={`${color} cursor-pointer rounded-xl p-4 text-white transition-opacity hover:opacity-90`}
          onClick={() => navigate(`/smart/${key}`)}
        >
          <div className="text-3xl font-bold">{counts[key]}</div>
          <div className="flex items-center gap-1 text-sm opacity-90">
            <Icon className="h-4 w-4" />
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
