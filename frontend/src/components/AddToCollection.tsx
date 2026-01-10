import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../api/collections';
import type { DocumentDetail } from '../api/types';

export default function AddToCollection({ document }: { document: DocumentDetail }) {
  const queryClient = useQueryClient();
  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  });
  const memberOf = new Set(document.collections.map((c) => c.id));

  const toggle = useMutation({
    mutationFn: async (collectionId: number) =>
      memberOf.has(collectionId)
        ? collectionsApi.removeDocument(collectionId, document.id)
        : collectionsApi.addDocument(collectionId, document.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });

  if (collections.length === 0) {
    return <p className="muted small">Create a collection first to organise documents.</p>;
  }

  return (
    <ul className="checklist">
      {collections.map((collection) => (
        <li key={collection.id}>
          <label>
            <input
              type="checkbox"
              checked={memberOf.has(collection.id)}
              disabled={toggle.isPending}
              onChange={() => toggle.mutate(collection.id)}
            />
            {collection.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
