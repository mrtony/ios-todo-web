import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface TaskDetailSheetProps {
  taskId: string;
  listId: string;
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{task?.title}</SheetTitle>
        </SheetHeader>
        <p className="mt-4 text-muted-foreground">任務編輯面板（下一個 Task 實作）</p>
      </SheetContent>
    </Sheet>
  );
}
