import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { boards } from "../../api/client";
import { fieldErrors } from "../../api/errors";
import { Button } from "../../components/Button/Button";
import { Dialog } from "../../components/Dialog/Dialog";
import { Field } from "../../components/Field/Field";
import { FormError } from "../../components/FormError/FormError";
import { useAction } from "../../hooks/useAction";
import { required } from "../../model/forms";

export function BoardCreateDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useAction(boards.create);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = required(name);
    setNameError(missing);
    setFormError(null);
    if (missing) return;
    const created = await create.execute({ name: name.trim() });
    if (created) {
      onClose();
      void navigate(`/boards/${created.id}`);
    }
  }

  // Derive server errors from the action state alongside local ones.
  const err = create.error;
  let shownName = nameError;
  let shownForm = formError;
  if (err) {
    const { byField } = fieldErrors(err, ["name"]);
    const nameMessage = byField.name ?? (err.code === "conflict" ? err.message : undefined);
    shownName = shownName ?? nameMessage;
    if (!nameMessage) shownForm = err.message;
  }

  return (
    <Dialog title="Create new board" onClose={onClose}>
      <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormError message={shownForm} />
        <Field label="Name" required error={shownName}>
          {(controlProps) => (
            <input
              {...controlProps}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(undefined);
                setFormError(null);
                create.reset();
              }}
            />
          )}
        </Field>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" pending={create.pending} pendingLabel="Creating…">
            Create board
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
