import { useState } from 'react';
import { useUserData } from '../hooks/useUserData';
import { updateJobs } from '../services/userDataService';

export default function JobsPage() {
  const { data, loading, uid } = useUserData();
  const [newJob, setNewJob] = useState('');
  const [rate, setRate] = useState('');
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const jobList = data?.jobs ?? {};

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

  async function deleteJob(job: string) {
    const updated = { ...jobList };
    delete updated[job];
    await persistJobs(updated);
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
              <button type="button" className="link-btn danger" onClick={() => deleteJob(job)}>
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
    </div>
  );
}
