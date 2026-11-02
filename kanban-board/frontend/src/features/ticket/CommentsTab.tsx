import { useEffect, useRef, useState, type FormEvent } from "react";
import { comments } from "../../api/client";
import { fieldErrors } from "../../api/errors";
import type { Comment } from "../../api/types";
import { Button } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Field } from "../../components/Field/Field";
import { FormError } from "../../components/FormError/FormError";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import { useAction } from "../../hooks/useAction";
import { useResource } from "../../hooks/useResource";
import { formatDateTime, initials } from "../../model/format";
import { requiredErrors } from "../../model/forms";
import { InlineError } from "./InlineError";
import styles from "./CommentsTab.module.css";

interface Props {
  ticketKey: string;
  onCountChange?: (count: number) => void;
  onAdded?: () => void;
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className={styles.item}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(comment.author)}
      </span>
      <div className={styles.body}>
        <p className={styles.head}>
          <strong>{comment.author}</strong>
          <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
        </p>
        <p className={styles.text}>{comment.text}</p>
      </div>
    </li>
  );
}

function CommentForm({ ticketKey, onAdded }: { ticketKey: string; onAdded: () => void }) {
  const add = useAction((body: { author: string; text: string }) => comments.add(ticketKey, body));
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ author?: string; text?: string }>({});
  const [dismissed, setDismissed] = useState(false);
  const authorRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const local = requiredErrors({ author, text }, ["author", "text"]);
    setErrors(local);
    if (local.author || local.text) return;
    setDismissed(false);
    const created = await add.execute({ author: author.trim(), text: text.trim() });
    if (created) {
      setAuthor("");
      setText("");
      onAdded();
      authorRef.current?.focus();
    }
  }

  const err = dismissed ? undefined : add.error;
  const split = err ? fieldErrors(err, ["author", "text"]) : { byField: {}, rest: [] as string[] };
  const by: Record<string, string | undefined> = split.byField;
  const formMessage = err && Object.keys(by).length === 0 ? err.message : null;

  const touch = () => {
    setDismissed(true);
    add.reset();
  };

  return (
    <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <FormError message={formMessage} />
      <Field label="Author" required error={errors.author ?? by.author}>
        {(p) => (
          <input
            {...p}
            ref={authorRef}
            type="text"
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setErrors((prev) => ({ ...prev, author: undefined }));
              touch();
            }}
          />
        )}
      </Field>
      <Field label="Text" required error={errors.text ?? by.text}>
        {(p) => (
          <textarea
            {...p}
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setErrors((prev) => ({ ...prev, text: undefined }));
              touch();
            }}
          />
        )}
      </Field>
      <div className="form-actions">
        <Button type="submit" pending={add.pending} pendingLabel="Adding…">
          Add comment
        </Button>
      </div>
    </form>
  );
}

export function CommentsTab({ ticketKey, onCountChange, onAdded }: Props) {
  const resource = useResource((signal) => comments.list(ticketKey, signal), [ticketKey]);
  const { status, data, error, reload } = resource;

  useEffect(() => {
    if (data) onCountChange?.(data.length);
  }, [data, onCountChange]);

  let list;
  if (!data && status !== "error") {
    list = <Skeleton lines={3} label="Loading comments" />;
  } else if (!data && error) {
    list = <InlineError message={error.message} onRetry={reload} />;
  } else if (data && data.length === 0) {
    list = <EmptyState title="No comments yet" description="Be the first to comment." />;
  } else if (data) {
    list = (
      <ul className={styles.list}>
        {data.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.tab}>
      {list}
      <CommentForm
        ticketKey={ticketKey}
        onAdded={() => {
          reload();
          onAdded?.();
        }}
      />
    </div>
  );
}
