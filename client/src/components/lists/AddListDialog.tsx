import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateList } from '@/hooks/use-lists';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function AddListDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const createList = useCreateList();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    createList.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName('');
          setColor(COLORS[0]);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" className="mt-4 w-full text-primary" />}
      >
        <Plus className="mr-2 h-4 w-4" />
        新增清單
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增清單</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">名稱</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="清單名稱"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>顏色</Label>
            <div className="flex gap-2">
              {COLORS.map((currentColor) => (
                <button
                  key={currentColor}
                  type="button"
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === currentColor ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: currentColor }}
                  onClick={() => setColor(currentColor)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createList.isPending}>
            {createList.isPending ? '建立中...' : '建立'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
