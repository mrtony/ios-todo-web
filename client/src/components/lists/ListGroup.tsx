import ListItem from './ListItem';

interface List {
  id: string;
  name: string;
  color: string;
}

interface ListGroupProps {
  lists: List[];
  taskCounts: Record<string, number>;
}

export default function ListGroup({ lists, taskCounts }: ListGroupProps) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">我的清單</h2>
      <div className="divide-y rounded-lg border">
        {lists.map((list) => (
          <ListItem
            key={list.id}
            id={list.id}
            name={list.name}
            color={list.color}
            taskCount={taskCounts[list.id] || 0}
          />
        ))}
        {lists.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            還沒有清單，點擊下方按鈕新增
          </p>
        )}
      </div>
    </div>
  );
}
