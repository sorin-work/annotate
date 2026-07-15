import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { documentsApi } from '../api/documents';
import type { DocumentDetail } from '../api/types';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';

type Mode = 'paste' | 'upload' | 'url';
const ACCEPT = '.txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf';

export default function NewDocumentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('paste');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [format, setFormat] = useState<'text' | 'markdown'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');

  const create = useMutation({
    mutationFn: (): Promise<DocumentDetail> =>
      mode === 'paste'
        ? documentsApi.create({
            title: title.trim(),
            content,
            source_type: format,
            author: author.trim() || null,
            source_url: sourceUrl.trim() || null,
          })
        : mode === 'upload'
          ? documentsApi.upload(file!, title.trim() || undefined)
          : documentsApi.importUrl(url.trim(), title.trim() || undefined),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/documents/${doc.id}`);
    },
  });

  const canSubmit =
    mode === 'paste'
      ? title.trim() !== '' && content.trim() !== ''
      : mode === 'upload'
        ? file !== null
        : url.trim() !== '';

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) create.mutate();
  }

  return (
    <>
      <PageHeader
        title="Add a document"
        subtitle="Paste text, upload a file or bring in a web page to start reading."
      />
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'paste'}
          onClick={() => setMode('paste')}
        >
          Paste text
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          onClick={() => setMode('upload')}
        >
          Upload a file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          onClick={() => setMode('url')}
        >
          From a web page
        </button>
      </div>

      <form className="form panel" onSubmit={onSubmit}>
        <label className="field">
          <span>Title{mode !== 'paste' && ' (optional)'}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required={mode === 'paste'}
            placeholder={
              mode === 'upload'
                ? 'Taken from the file if left empty'
                : mode === 'url'
                  ? 'Taken from the page if left empty'
                  : undefined
            }
          />
        </label>

        {mode === 'paste' && (
          <>
            <div className="field-row">
              <label className="field">
                <span>Author</span>
                <input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </label>
              <label className="field">
                <span>Source URL</span>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://"
                />
              </label>
            </div>
            <fieldset className="field radio-group">
              <legend>Format</legend>
              <label>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'text'}
                  onChange={() => setFormat('text')}
                />
                Plain text
              </label>
              <label>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'markdown'}
                  onChange={() => setFormat('markdown')}
                />
                Markdown
              </label>
            </fieldset>
            <label className="field">
              <span>Text</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                required
                placeholder="Paste an article, a chapter, your own notes…"
              />
            </label>
          </>
        )}
        {mode === 'upload' && (
          <label className="field dropzone">
            <span>File</span>
            <input
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <small className="muted">
              Plain text, Markdown or PDF, up to 10 MB. PDFs need selectable text; scanned pages are
              not supported.
            </small>
          </label>
        )}
        {mode === 'url' && (
          <label className="field">
            <span>Web address</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <small className="muted">
              An article, a plain text or Markdown file, or a PDF. annotate keeps the readable text
              and leaves out menus and ads.
            </small>
          </label>
        )}

        <ErrorMessage error={create.error} />
        <div className="form-actions">
          <button type="button" className="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!canSubmit || create.isPending}
          >
            {create.isPending ? (mode === 'url' ? 'Fetching…' : 'Saving…') : 'Add document'}
          </button>
        </div>
      </form>
    </>
  );
}
