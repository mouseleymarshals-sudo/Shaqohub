import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { EmptyState, SkeletonList } from '../components/Feedback';
import { SectorIcon, LocationIcon, SalaryIcon } from '../components/Icons';

export function JobsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select(`
        *,
        profiles!posted_by (institution_name, logo)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filterCity) query = query.eq('location_city', filterCity);
    if (filterType) query = query.eq('institution_type', filterType);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching jobs:', error.message);
    } else {
      setJobs((data as unknown as Job[]) || []);
    }
    setLoading(false);
  }, [filterCity, filterType]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter((job) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.description.toLowerCase().includes(q) ||
      job.subjects?.some((s) => s.toLowerCase().includes(q)) ||
      job.profiles?.institution_name?.toLowerCase().includes(q)
    );
  });

  const avatar = profile?.full_name?.[0]?.toUpperCase() || profile?.institution_name?.[0]?.toUpperCase() || (profile?.email ? profile.email[0].toUpperCase() : '?');

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <Logo size="sm" />
          <button
            onClick={() => navigate('/profile')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition-colors hover:bg-primary-100"
          >
            {avatar}
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="input pl-10"
              placeholder="Search jobs, subjects, schools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-xl border transition-all duration-200 ${
              showFilters || filterCity || filterType ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex gap-2 animate-fade-in">
            <select
              className="input flex-1 py-2"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="">All Cities</option>
              <option value="Mogadishu">Mogadishu</option>
              <option value="Hargeisa">Hargeisa</option>
              <option value="Bosaso">Bosaso</option>
              <option value="Kismayo">Kismayo</option>
              <option value="Galkayo">Galkayo</option>
            </select>
            <select
              className="input flex-1 py-2"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="school">School</option>
              <option value="university">University</option>
            </select>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 7l9-4 9 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            title="No jobs found"
            message="Try adjusting your search or filters to find teaching positions."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium">{filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} available</p>
            {filtered.map((job, idx) => (
              <button
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="card-hover w-full text-left active:scale-[0.98] animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <SectorIcon type={job.institution_type} size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{job.profiles?.institution_name || 'Unknown institution'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.subjects?.slice(0, 3).map((s, i) => (
                        <span key={i} className="badge bg-primary-50 text-primary-700">{s}</span>
                      ))}
                      {job.subjects?.length > 3 && (
                        <span className="badge bg-gray-100 text-gray-500">+{job.subjects.length - 3}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      {job.location_city && (
                        <span className="flex items-center gap-1">
                          <LocationIcon size={12} />
                          {job.location_city}
                        </span>
                      )}
                      {job.salary_amount && (
                        <span className="flex items-center gap-1">
                          <SalaryIcon size={12} />
                          {job.salary_amount.toLocaleString()} {job.salary_currency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
