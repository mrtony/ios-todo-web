import AddListDialog from '@/components/lists/AddListDialog';
import ListGroup from '@/components/lists/ListGroup';
import SmartListGrid from '@/components/lists/SmartListGrid';
import { useLists } from '@/hooks/use-lists';

export default function HomePage() {
  const { data: lists = [], isLoading } = useLists();

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>;
  }

  return (
    <div>
      <SmartListGrid todayCount={0} scheduledCount={0} allCount={0} flaggedCount={0} />
      <ListGroup lists={lists} taskCounts={{}} />
      <AddListDialog />
    </div>
  );
}
