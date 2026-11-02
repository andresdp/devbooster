import { useState, type FormEvent } from "react";
import { tickets } from "../../api/client";
import { fieldErrors } from "../../api/errors";
import type { Priority, TicketCreate, TicketType } from "../../api/types";
import { PRIORITIES, TICKET_TYPES } from "../../api/types";
import { Button } from "../../components/Button/Button";
import { Dialog } from "../../components/Dialog/Dialog";
import { Field } from "../../components/Field/Field";
import { FormError } from "../../components/FormError/FormError";
import { useAction } from "../../hooks/useAction";
import { required } from "../../model/forms";
import styles from "./TicketCreateDialog.module.css";

interface Props {
  boardId: number;
  onClose: () => void;
  onCreated: () => void;
}

type SentBody = Pick<TicketCreate, "title"> & Partial<TicketCreate>;
const FIELDS = ["title", "description", "type", "priority", "assignee"] as const;
const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export function TicketCreateDialog({ boardId, onClose, onCreated }: Props) {
  // The schema marks server-side defaults as required; only the fields the user changed are sent (AS-006).
  const create = useAction((body: SentBody) => tickets.create(boardId, body as TicketCreate));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("task");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  function edit() {
    setDismissed(true);
    create.reset();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = required(title);
    setTitleError(missing);
    if (missing) return;
    const body: SentBody = { title: title.trim() };
    if (description.trim() !== "") body.description = description;
    if (type !== "task") body.type = type;
    if (priority !== "medium") body.priority = priority;
    if (assignee.trim() !== "") body.assignee = assignee.trim();
    setDismissed(false);
    const created = await create.execute(body);
    if (created) {
      onCreated();
      onClose();
    }
  }

  const err = !dismissed ? create.error : undefined;
  const split = err ? fieldErrors(err, FIELDS) : { byField: {}, rest: [] as string[] };
  const by: Record<string, string | undefined> = split.byField;
  const formMessage = err && Object.keys(by).length === 0 ? err.message : null;
  const extra = err && Object.keys(by).length > 0 ? split.rest : [];

  return (
    <Dialog title="New ticket" onClose={onClose}>
      <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormError
          message={formMessage ?? (extra.length > 0 ? "Please review the form." : null)}
          messages={extra}
        />
        <Field label="Title" required error={titleError ?? by.title}>
          {(p) => (
            <input
              {...p}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(undefined);
                edit();
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
                edit();
              }}
            />
          )}
        </Field>
        <div className={styles.row}>
          <Field label="Type" error={by.type}>
            {(p) => (
              <select
                {...p}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as TicketType);
                  edit();
                }}
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Priority" error={by.priority}>
            {(p) => (
              <select
                {...p}
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                  edit();
                }}
              >
                {PRIORITIES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Assignee" error={by.assignee}>
          {(p) => (
            <input
              {...p}
              type="text"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                edit();
              }}
            />
          )}
        </Field>
        <p className={styles.note}>The ticket will be added to the bottom of To Do.</p>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" pending={create.pending} pendingLabel="Creating…">
            Create ticket
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
