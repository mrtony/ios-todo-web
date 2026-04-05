import AddListDialog from '@/components/lists/AddListDialog';
import ListGroup from '@/components/lists/ListGroup';
import SmartListGrid from '@/components/lists/SmartListGrid';
import TagGroup from '@/components/tags/TagGroup';
import { useSmartListCounts } from '@/hooks/use-all-tasks';
import { useLists } from '@/hooks/use-lists';

export default function HomePage() {
  const { data: lists = [], isLoading } = useLists();
  const { todayCount, scheduledCount, allCount, flaggedCount, taskCountsByList } = useSmartListCounts();

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>;
  }

  return (
    <div>
      <SmartListGrid
        todayCount={todayCount}
        scheduledCount={scheduledCount}
        allCount={allCount}
        flaggedCount={flaggedCount}
      />
      <ListGroup lists={lists} taskCounts={taskCountsByList} />
      <TagGroup />
      <AddListDialog />
    </div>
  );
}
