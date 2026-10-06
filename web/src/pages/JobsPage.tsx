import { useState } from 'react';
import { useUserData } from '../hooks/useUserData';
import { updateJobs, updateJobsAndEntries } from '../services/userDataService';

function countJobUsage(
  entries: Record<string, { job: string; hours: number }[]>,
  job: string,
) {
  let count = 0;
  let hours = 0;
  for (const day of Object.values(entries)) {
    for (const entry of day) {
      if (entry.job !== job) continue;
      count += 1;
      hours += entry.hours;
    }
  }
  return { count, hours };
}

function entriesWithoutJob(
  entries: Record<string, { job: string; hours: number }[]>,
  job: string,
) {
  const next: typeof entries = {};
  for (const [date, day] of Object.entries(entries)) {
    const kept = day.filter((entry) => entry.job !== job);
    if (kept.length > 0) next[date] = kept;
  }
  return next;
}

export default function JobsPage() {
  const { data, loading, uid } = useUserData();
  const [newJob, setNewJob] = useState('');
  const [rate, setRate] = useState('');
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const jobList = data?.jobs ?? {};
  const entries = data?.entries ?? {};
  const pendingUsage = pendingDelete ? countJobUsage(entries, pendingDelete) : null;

  async function persistJobs(updated: typeof jobList) {
    if (!uid) return;
    setSaving(true);
    try {
      await updateJobs(uid, updated);
      setNewJob('');
      setRate('');
      setEditingJob(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function saveJob() {
    if (!newJob.trim() || !rate) {
      setError('Completa todos los campos');
      return;
    }
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      setError('Introduce una tarifa válida');
      return;
    }

    await persistJobs({
      ...jobList,
      [newJob.trim()]: { rate: parsedRate },
    });
  }

  function startEditJob(job: string) {
    setEditingJob(job);
    setNewJob(job);
    setRate(jobList[job].rate.toString());
  }

  function requestDeleteJob(job: string) {
    const usage = countJobUsage(entries, job);
    if (usage.count > 0) {
      setPendingDelete(job);
      return;
    }
    void removeJob(job);
  }

  async function removeJob(job: string) {
    if (!uid) return;
    const updated = { ...jobList };
    delete updated[job];
    const usage = countJobUsage(entries, job);
    setSaving(true);
    try {
      if (usage.count > 0) {
        await updateJobsAndEntries(uid, updated, entriesWithoutJob(entries, job));
      } else {
        await updateJobs(uid, updated);
      }
      if (editingJob === job) {
        setEditingJob(null);
        setNewJob('');
        setRate('');
      }
      setPendingDelete(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  }

  async function confirmEditJob() {
    if (!newJob.trim() || !rate) {
      setError('Completa todos los campos');
      return;
    }
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      setError('Introduce una tarifa válida');
      return;
    }

    const updated = { ...jobList };
    if (editingJob && editingJob !== newJob.trim()) {
      delete updated[editingJob];
    }
    updated[newJob.trim()] = { rate: parsedRate };
    await persistJobs(updated);
  }

  if (loading) {
    return <div className="page-loading">Cargando trabajos...</div>;
  }

  return (
    <div className="page jobs-page">
      <h2>Trabajos guardados</h2>

      {error && <p className="error-text">{error}</p>}

      <ul className="job-list">
        {Object.entries(jobList).map(([job, info]) => (
          <li key={job} className="job-item card">
            <div>
              <strong>{job}</strong>
              <p>{info.rate.toFixed(2)} €/h</p>
            </div>
            <div className="entry-actions">
              <button type="button" className="link-btn" onClick={() => startEditJob(job)}>
                Editar
              </button>
              <button type="button" className="link-btn danger" onClick={() => requestDeleteJob(job)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {Object.keys(jobList).length === 0 && (
          <p className="empty-text">Aún no tienes trabajos. Añade el primero abajo.</p>
        )}
      </ul>

      <section className="card job-form">
        <label htmlFor="job-name">Nombre del trabajo</label>
        <input
          id="job-name"
          value={newJob}
          onChange={(e) => setNewJob(e.target.value)}
          placeholder="Nombre del trabajo"
        />

        <label htmlFor="job-rate">Precio por hora (€)</label>
        <input
          id="job-rate"
          type="number"
          step="0.01"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Precio por hora"
        />

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={editingJob ? confirmEditJob : saveJob}
          disabled={saving}
        >
          {saving ? 'Guardando...' : editingJob ? 'Actualizar trabajo' : 'Guardar trabajo'}
        </button>

        {editingJob && (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              setEditingJob(null);
              setNewJob('');
              setRate('');
            }}
          >
            Cancelar edición
          </button>
        )}
      </section>

      {pendingDelete && pendingUsage && pendingUsage.count > 0 && (
        <div className="modal-overlay" role="presentation">
          <div className="modal modal-attention" role="dialog" aria-modal="true" aria-labelledby="delete-job-title">
            <p id="delete-job-title" className="attention-title">
              ⚠️ ATENCIÓN ⚠️
            </p>
            <p>
              <strong>«{pendingDelete}»</strong> tiene{' '}
              {pendingUsage.count === 1
                ? '1 registro'
                : `${pendingUsage.count} registros`}{' '}
              ({pendingUsage.hours.toLocaleString('es-ES', { maximumFractionDigits: 2 })} h).
            </p>
            <p className="attention-warning">
              Si lo eliminas, se borran también esas horas. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPendingDelete(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void removeJob(pendingDelete)}
                disabled={saving}
              >
                {saving ? 'Eliminando...' : 'Eliminar trabajo y horas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
