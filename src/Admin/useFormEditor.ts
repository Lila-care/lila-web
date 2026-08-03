import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  createForm,
  CreateFormPayload,
  getForm,
  LilaForm,
  publishForm,
  unpublishForm,
  updateForm,
  UpdateFormPayload,
} from "@/api/forms";

// Encapsulates loading a single form (when editing an existing one) plus the three
// write actions (create/update/publish) with their own saving/error state — the
// FormsPage decides which of these to call based on whether a formId was selected.
export function useFormEditor(formId: string | null) {
  const { token } = useAuth();
  const [form, setForm] = useState<LilaForm | null>(null);
  const [loading, setLoading] = useState(!!formId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !formId) {
      setForm(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    getForm(token, formId)
      .then(setForm)
      .catch((e) =>
        setLoadError(
          e instanceof Error ? e.message : "Error al cargar el form",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, formId]);

  const create = useCallback(
    async (payload: CreateFormPayload): Promise<LilaForm | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const created = await createForm(token, payload);
        setForm(created);
        return created;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error al crear el form");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const update = useCallback(
    async (
      id: string,
      payload: UpdateFormPayload,
    ): Promise<LilaForm | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const updated = await updateForm(token, id, payload);
        setForm(updated);
        return updated;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al guardar el form",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const publish = useCallback(
    async (id: string): Promise<LilaForm | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const published = await publishForm(token, id);
        setForm(published);
        return published;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al publicar el form",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const unpublish = useCallback(
    async (id: string): Promise<LilaForm | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const unpublished = await unpublishForm(token, id);
        setForm(unpublished);
        return unpublished;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al pasar el form a borrador",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return {
    form,
    loading,
    loadError,
    saving,
    saveError,
    create,
    update,
    publish,
    unpublish,
  };
}
