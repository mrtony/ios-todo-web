import { useTagsWithCounts } from '@/hooks/use-tags';
import TagItem from './TagItem';

export default function TagGroup() {
  const { data: tags = [] } = useTagsWithCounts();

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">標籤</h2>
      <div className="divide-y rounded-lg border">
        {tags.map((tag) => (
          <TagItem
            key={tag.id}
            id={tag.id}
            name={tag.name}
            color={tag.color}
            taskCount={tag.task_count}
          />
        ))}
      </div>
    </div>
  );
}
