import { useEffect } from 'react';

const APP = 'annotate';

/** Sets the browser tab title to "<title> · annotate" while the page is shown. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP;
  }, [title]);
}
