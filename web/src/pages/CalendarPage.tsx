import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { useUserData } from '../hooks/useUserData';
import { updateEntries, updateProfile } from '../services/userDataService';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { buildMonthlyReportHtml, monthlyReportFileBaseName } from '../utils/generatePDF';
import { parseMonthKey } from '../utils/dateHelpers';
import {
  DURATION_MINUTES,
  decimalToDuration,
  durationToDecimal,
  formatDuration,
  validateDayTotal,
  validateDurationParts,
} from '../utils/validations';
import type { WorkEntry } from '../types';
import 'react-day-picker/style.css';

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarPage() {
  const { data, loading, uid } = useUserData();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const entries = data?.entries ?? {};
  const jobList = data?.jobs ?? {};
  const userName = data?.profile.name ?? '';

  const monthKey = parseMonthKey(selectedMonth.getFullYear(), selectedMonth.getMonth());

  const { monthHours, monthMoney } = useMemo(() => {
    let hoursTotal = 0;
    let moneyTotal = 0;
    Object.entries(entries).forEach(([date, dayEntries]) => {
      if (date.startsWith(monthKey)) {
        dayEntries.forEach(({ job, hours: h }) => {
          hoursTotal += h;
          moneyTotal += h * (jobList[job]?.rate || 0);
        });
      }
    });
    return { monthHours: hoursTotal, monthMoney: moneyTotal };
  }, [entries, jobList, monthKey]);

  const markedDates = useMemo(
    () => Object.keys(entries).map((dateStr) => new Date(dateStr + 'T12:00:00')),
    [entries],
  );

  function openDayModal(date: Date) {
    setSelectedDate(formatDateString(date));
    setSelectedJob('');
    setDurationHours(1);
    setDurationMinutes(0);
    setEditingIndex(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function saveEntry() {
    if (!uid || !selectedDate) return;
    if (!selectedJob) {
      setFormError('Completa todos los campos');
      return;
    }

    const durationError = validateDurationParts(durationHours, durationMinutes);
    if (durationError) {
      setFormError(durationError);
      return;
    }

    const parsedHours = durationToDecimal(durationHours, durationMinutes);

    const totalHoursForDay = (entries[selectedDate] || []).reduce((acc, e, idx) => {
      if (idx === editingIndex) return acc;
      return acc + e.hours;
    }, 0);

    const dayError = validateDayTotal(totalHoursForDay, parsedHours);
    if (dayError) {
      setFormError(dayError);
      return;
    }

    const newEntry: WorkEntry = { job: selectedJob, hours: parsedHours };
    const updated = { ...entries };
    if (!updated[selectedDate]) updated[selectedDate] = [];

    if (editingIndex !== null) {
      updated[selectedDate][editingIndex] = newEntry;
    } else {
      updated[selectedDate].push(newEntry);
    }

    setSaving(true);
    try {
      await updateEntries(uid, updated);
      setSelectedJob('');
      setDurationHours(0);
      setDurationMinutes(0);
      setEditingIndex(null);
      setModalOpen(false);
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(index: number) {
    if (!uid || !selectedDate) return;
    const updated = { ...entries };
    updated[selectedDate].splice(index, 1);
    if (updated[selectedDate].length === 0) delete updated[selectedDate];
    await updateEntries(uid, updated);
  }

  function startEditEntry(index: number) {
    if (!selectedDate) return;
    const entry = entries[selectedDate][index];
    setSelectedJob(entry.job);
    const parts = decimalToDuration(entry.hours);
    setDurationHours(parts.hours);
    setDurationMinutes(parts.minutes);
    setEditingIndex(index);
  }

  async function saveUserName() {
    if (!uid || !data) return;
    await updateProfile(uid, nameDraft, data.profile.email);
    setIsEditingName(false);
  }

  function closeReportPreview() {
    setReportPreviewOpen(false);
    setReportHtml(null);
    setReportLoading(false);
  }

  async function handleGeneratePDF() {
    setPageError(null);
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    setReportPreviewOpen(true);
    setReportHtml(null);
    setReportLoading(true);
    try {
      const html = await buildMonthlyReportHtml(entries, year, month, userName, jobList);
      setReportHtml(html);
    } catch (err) {
      closeReportPreview();
      setPageError(err instanceof Error ? err.message : 'Error al generar PDF');
    } finally {
      setReportLoading(false);
    }
  }

  const reportTitle = `Informe ${monthKey}`;
  const reportFileBaseName = monthlyReportFileBaseName(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth(),
  );

  if (loading) {
    return <div className="page-loading">Cargando datos...</div>;
  }

  return (
    <div className="page calendar-page">
      <section className="card profile-card">
        {isEditingName ? (
          <div className="profile-edit">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Introduce tu nombre"
            />
            <button type="button" className="btn btn-success" onClick={saveUserName}>
              Guardar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditingName(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="profile-row">
            <h2>Hola, {userName || 'Usuario'}</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setNameDraft(userName);
                setIsEditingName(true);
              }}
            >
              Editar
            </button>
          </div>
        )}
      </section>

      <section className="card calendar-card">
        <DayPicker
          mode="single"
          locale={es}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          modifiers={{ hasEntries: markedDates }}
          modifiersClassNames={{ hasEntries: 'day-has-entries' }}
          onDayClick={openDayModal}
        />
      </section>

      {pageError && <p className="error-text">{pageError}</p>}

      <button type="button" className="btn btn-primary btn-block" onClick={handleGeneratePDF}>
        Informe en PDF
      </button>

      <section className="card summary-card">
        <h3 className="summary-card-title">Resumen de {monthKey}</h3>
        <div className="summary-metrics">
          <div className="summary-metric">
            <span className="summary-metric-label">Horas</span>
            <p className="summary-hours">{monthHours.toFixed(2)} h</p>
          </div>
          <div className="summary-metric">
            <span className="summary-metric-label">Ingresos</span>
            <p className="summary-money">{monthMoney.toFixed(2)} €</p>
          </div>
        </div>
      </section>

      {reportPreviewOpen && (
        <ReportPreviewModal
          title={reportTitle}
          html={reportHtml}
          loading={reportLoading}
          fileBaseName={reportFileBaseName}
          onClose={closeReportPreview}
        />
      )}

      {modalOpen && selectedDate && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Trabajo para {selectedDate}</h3>

            {formError && <p className="error-text">{formError}</p>}

            <label htmlFor="job-select">Seleccionar trabajo</label>
            <select
              id="job-select"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              <option value="">Seleccione un trabajo</option>
              {Object.keys(jobList).map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>

            <span className="field-label">Duración</span>
            <div className="duration-row">
              <div className="duration-field">
                <label htmlFor="duration-hours">Horas</label>
                <select
                  id="duration-hours"
                  value={durationHours}
                  onChange={(e) => {
                    const nextHours = Number(e.target.value);
                    setDurationHours(nextHours);
                    if (nextHours === 24) setDurationMinutes(0);
                  }}
                >
                  {Array.from({ length: 25 }, (_, value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="duration-field">
                <label htmlFor="duration-minutes">Minutos</label>
                <select
                  id="duration-minutes"
                  value={durationMinutes}
                  disabled={durationHours === 24}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  {DURATION_MINUTES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-success" onClick={saveEntry} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
            </div>

            <h4>Entradas guardadas</h4>
            <ul className="entry-list">
              {(entries[selectedDate] || []).map((item, index) => (
                <li key={index}>
                  <span>
                    {item.job}: {formatDuration(item.hours)}
                  </span>
                  <span className="entry-actions">
                    <button type="button" className="link-btn" onClick={() => startEditEntry(index)}>
                      Editar
                    </button>
                    <button type="button" className="link-btn danger" onClick={() => deleteEntry(index)}>
                      Eliminar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
