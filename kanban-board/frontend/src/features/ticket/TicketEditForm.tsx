import { useState, type FormEvent } from "react";
import { tickets } from "../../api/client";
import { fieldErrors } from "../../api/errors";
import type { Priority, Ticket, TicketType, TicketUpdate } from "../../api/types";
import { Button } from "../../components/Button/Button";
import { Field } from "../../components/Field/Field";
import { FormError } from "../../components/FormError/FormError";
import { Icon } from "../../components/Icon/Icon";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { useAction } from "../../hooks/useAction";
import { diffTicket, required } from "../../model/forms";
import styles from "./TicketEditForm.module.css";

interface Props {
  ticket: Ticket;
  onCancel: () => void;
  onSaved: (updated: Ticket) => void;
}

const FIELDS = ["title", "description", "type", "priority", "assignee"] as const;
const TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
] as const;
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export function TicketEditForm({ ticket, onCancel, onSaved }: Props) {
  const save = useAction((body: TicketUpdate) => tickets.update(ticket.key, body));
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [type, setType] = useState<TicketType>(ticket.type);
  const [priority, setPriority] = useState<Priority>(ticket.priority);
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  const touch = () => {
    setDismissed(true);
    save.reset();
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = required(title);
    setTitleError(missing);
    if (missing) return;
    const diff = diffTicket(ticket, { title, description, type, priority, assignee });
    if (Object.keys(diff).length === 0) {
      onCancel();
      return;
    }
    setDismissed(false);
    const updated = await save.execute(diff);
    if (updated) onSaved(updated);
  }

  const err = dismissed ? undefined : save.error;
  const split = err ? fieldErrors(err, FIELDS) : { byField: {}, rest: [] as string[] };
  const by: Record<string, string | undefined> = split.byField;
  const hasFieldErrors = Object.keys(by).length > 0;
  const formMessage = err && !hasFieldErrors ? err.message : null;

  return (
    <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <FormError
        message={formMessage ?? (split.rest.length > 0 ? "Please review the form." : null)}
        messages={split.rest}
      />
      <Field label="Title" required error={titleError ?? by.title}>
        {(p) => (
          <input
            {...p}
            type="text"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(undefined);
              touch();
            }}
          />
        )}
      </Field>
      <Field label="Description" error={by.description}>
        {(p) => (
          <textarea
            {...p}
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              touch();
            }}
          />
        )}
      </Field>
      <SegmentedControl
        label="Type"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(v) => {
          setType(v);
          touch();
        }}
      />
      {by.type ? <p role="alert">{by.type}</p> : null}
      <SegmentedControl
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={priority}
        onChange={(v) => {
          setPriority(v);
          touch();
        }}
      />
      {by.priority ? <p role="alert">{by.priority}</p> : null}
      <Field label="Assignee" error={by.assignee}>
        {(p) => (
          <div className={styles.assignee}>
            <input
              {...p}
              type="text"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                touch();
              }}
            />
            {assignee ? (
              <button
                type="button"
                className={styles.clear}
                aria-label="Clear assignee"
                onClick={() => {
                  setAssignee("");
                  touch();
                }}
              >
                <Icon name="clear" />
              </button>
            ) : null}
          </div>
        )}
      </Field>
      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={save.pending} pendingLabel="Saving…">
          Save
        </Button>
      </div>
    </form>
  );
}
