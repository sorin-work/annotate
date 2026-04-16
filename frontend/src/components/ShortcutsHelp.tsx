import Modal from './Modal';

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Anywhere',
    keys: [
      ['/', 'Search'],
      ['?', 'Show this list'],
    ],
  },
  {
    title: 'Reading a document',
    keys: [
      ['1 – 5', 'Highlight the selection in yellow, green, blue, pink or purple'],
      ['j / k', 'Next / previous highlight'],
      ['Esc', 'Cancel the selection or close the highlight'],
    ],
  },
];

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      {GROUPS.map((group) => (
        <section key={group.title} className="shortcuts-group">
          <h3>{group.title}</h3>
          <dl>
            {group.keys.map(([key, action]) => (
              <div key={key}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Modal>
  );
}
