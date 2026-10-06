import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { useUserData } from '../hooks/useUserData';
import { formatDateISO, getStartOfWeek } from '../utils/dateHelpers';
import { formatDuration } from '../utils/validations';
import {
  buildMonthlyChartData,
  buildPieChartData,
  buildWeeklyChartData,
  flattenEntriesInRange,
  formatStatValue,
  getEntryValue,
  sortEntriesByDateDesc,
  sumEntryValues,
} from '../utils/statsHelpers';
import {
  JOB_COLORS,
  type DisplayMode,
  type FilterMode,
  type JobInfo,
  type StatsTab,
} from '../types';

const StatsChartPanel = lazy(() => import('../components/stats/StatsChartPanel'));

const TABS: { key: StatsTab; label: string }[] = [
  { key: 'weekly', label: 'Semana' },
  { key: 'monthly', label: 'Mes' },
  { key: 'daily', label: 'Días' },
  { key: 'byJob', label: 'Trabajos' },
];

const FILTER_MODES: { key: FilterMode; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'range', label: 'Rango' },
];

export default function StatsPage() {
  const { data, loading } = useUserData();
  const [selectedTab, setSelectedTab] = useState<StatsTab>('weekly');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('hours');
  const [filterMode, setFilterMode] = useState<FilterMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>();

  const entries = data?.entries ?? {};
  const jobList = data?.jobs ?? {};

  const jobInfo = useMemo(() => {
    const info: Record<string, JobInfo> = {};
    Object.keys(jobList).forEach((job, index) => {
      info[job] = {
        rate: jobList[job].rate,
        color: JOB_COLORS[index % JOB_COLORS.length],
      };
    });
    return info;
  }, [jobList]);

  const jobs = useMemo(() => Object.keys(jobInfo), [jobInfo]);

  useEffect(() => {
    if (filterMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDateRange({
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
      });
    } else if (filterMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      setDateRange({
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
      });
    }
  }, [currentDate, filterMode]);

  const filteredEntries = useMemo(
    () => flattenEntriesInRange(entries, dateRange.startDate, dateRange.endDate),
    [entries, dateRange],
  );

  const sortedDailyEntries = useMemo(
    () => sortEntriesByDateDesc(filteredEntries),
    [filteredEntries],
  );

  const periodTotal = useMemo(
    () => sumEntryValues(filteredEntries, displayMode, jobInfo),
    [filteredEntries, displayMode, jobInfo],
  );

  const weeklyChartData = useMemo(() => {
    if (selectedTab !== 'weekly') return [];
    return buildWeeklyChartData(filteredEntries, jobs, displayMode, jobInfo);
  }, [selectedTab, filteredEntries, jobs, displayMode, jobInfo]);

  const monthlyChartData = useMemo(() => {
    if (selectedTab !== 'monthly') return [];
    return buildMonthlyChartData(filteredEntries, jobs, displayMode, jobInfo);
  }, [selectedTab, filteredEntries, jobs, displayMode, jobInfo]);

  const pieChartData = useMemo(() => {
    if (selectedTab !== 'byJob') return [];
    return buildPieChartData(filteredEntries, jobs, displayMode, jobInfo);
  }, [selectedTab, filteredEntries, jobs, displayMode, jobInfo]);

  const showDateNavigator =
    selectedTab === 'weekly' ||
    selectedTab === 'monthly' ||
    ((selectedTab === 'daily' || selectedTab === 'byJob') && filterMode !== 'range');

  function handleDateNav(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate);
    const increment = direction === 'prev' ? -1 : 1;
    if (filterMode === 'week' || selectedTab === 'weekly') {
      newDate.setDate(newDate.getDate() + 7 * increment);
    } else if (filterMode === 'month' || selectedTab === 'monthly') {
      newDate.setMonth(newDate.getMonth() + increment);
    }
    setCurrentDate(newDate);
  }

  function getHeaderTitle(): string {
    if (filterMode === 'range') return `${dateRange.startDate} — ${dateRange.endDate}`;
    if (filterMode === 'week' || selectedTab === 'weekly') {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
    }
    if (filterMode === 'month' || selectedTab === 'monthly') {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    return '';
  }

  function applyDateFilter() {
    if (tempRange?.from && tempRange?.to) {
      setDateRange({
        startDate: formatDateISO(tempRange.from),
        endDate: formatDateISO(tempRange.to),
      });
      setFilterMode('range');
      setCalendarVisible(false);
    }
  }

  function selectTab(tab: StatsTab) {
    setSelectedTab(tab);
    if (tab === 'weekly') {
      setFilterMode('week');
      setCurrentDate(new Date());
    } else if (tab === 'monthly') {
      setFilterMode('month');
      setCurrentDate(new Date());
    }
  }

  if (loading) {
    return <div className="page-loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="page stats-page">
      <h2 className="stats-page-title">Estadísticas</h2>

      <div className="tabs stats-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn${selectedTab === tab.key ? ' active' : ''}`}
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="card stats-summary">
        <div>
          <p className="stats-summary-label">Total del período</p>
          <p className="stats-summary-value">{formatStatValue(periodTotal, displayMode)}</p>
        </div>
        <div className="stats-summary-meta">
          <span>{filteredEntries.length} registros</span>
          <span>{getHeaderTitle() || '—'}</span>
        </div>
      </section>

      <section className="card filter-section stats-filters">
        <div className="filter-row">
          <div className="switch-row">
            <span>Horas</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={displayMode === 'money'}
                onChange={(e) => setDisplayMode(e.target.checked ? 'money' : 'hours')}
              />
              <span className="slider" />
            </label>
            <span>Dinero</span>
          </div>

          {(selectedTab === 'daily' || selectedTab === 'byJob') && (
            <div className="tabs compact-tabs stats-filter-tabs">
              {FILTER_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`tab-btn${filterMode === mode.key ? ' active' : ''}`}
                  onClick={() => {
                    if (mode.key === 'range') {
                      setTempRange(undefined);
                      setCalendarVisible(true);
                    } else {
                      setFilterMode(mode.key);
                      setCurrentDate(new Date());
                    }
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {showDateNavigator && (
        <div className="date-navigator">
          <button type="button" className="btn btn-ghost btn-nav" onClick={() => handleDateNav('prev')}>
            ‹
          </button>
          <strong className="date-navigator-title">{getHeaderTitle()}</strong>
          <button type="button" className="btn btn-ghost btn-nav" onClick={() => handleDateNav('next')}>
            ›
          </button>
        </div>
      )}
      {filterMode === 'range' && (selectedTab === 'daily' || selectedTab === 'byJob') && (
        <p className="range-title">{getHeaderTitle()}</p>
      )}

      {selectedTab !== 'daily' && (
        <Suspense fallback={<p className="empty-text">Cargando gráficos...</p>}>
          <StatsChartPanel
            selectedTab={selectedTab}
            displayMode={displayMode}
            jobs={jobs}
            jobInfo={jobInfo}
            weeklyChartData={weeklyChartData}
            monthlyChartData={monthlyChartData}
            pieChartData={pieChartData}
          />
        </Suspense>
      )}

      {selectedTab === 'daily' && (
        <ul className="daily-list">
          {sortedDailyEntries.length === 0 ? (
            <li className="empty-text">Sin datos en este rango.</li>
          ) : (
            sortedDailyEntries.map((item) => (
              <li key={item.id} className="card daily-item">
                <div>
                  <strong style={{ color: jobInfo[item.job]?.color || '#374151' }}>{item.job}</strong>
                  <p className="daily-item-date">{item.date}</p>
                </div>
                <strong className="daily-item-value">
                  {displayMode === 'hours'
                    ? formatDuration(item.hours)
                    : formatStatValue(getEntryValue(item, 'money', jobInfo), 'money')}
                </strong>
              </li>
            ))
          )}
        </ul>
      )}

      {calendarVisible && (
        <div className="modal-overlay" onClick={() => setCalendarVisible(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Seleccionar rango</h3>
            <DayPicker mode="range" locale={es} selected={tempRange} onSelect={setTempRange} />
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={applyDateFilter}>
                Aplicar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCalendarVisible(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
