import React, { useState } from 'react';
import { Megaphone, PhoneCall, Send, ShieldAlert } from 'lucide-react';
import { TRANSLATIONS, type LanguageCode } from '../i18n';
import { EMERGENCY_HOTLINES, type CityAnnouncement, type User } from '../types/report';

interface HotlinesAndNoticesProps {
  announcements: CityAnnouncement[];
  user: User | null;
  token: string | null;
  lang: LanguageCode;
  onAnnouncementCreated: (ann: CityAnnouncement) => void;
  isMobileView?: boolean;
}

export const HotlinesAndNotices: React.FC<HotlinesAndNoticesProps> = ({
  announcements,
  user,
  token,
  lang,
  onAnnouncementCreated,
  isMobileView = false,
}) => {
  const t = TRANSLATIONS[lang];
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CityAnnouncement['category']>('Municipal Notice');
  const [barangayScope, setBarangayScope] = useState('All San Mateo Barangays');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, category, barangayScope, message }),
      });
      const data = (await res.json()) as { announcement?: CityAnnouncement; error?: string };
      if (!res.ok || !data.announcement) {
        throw new Error(data.error || 'Failed to publish announcement.');
      }
      onAnnouncementCreated(data.announcement);
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="bg-[#F3F7FD] min-h-[calc(100vh-140px)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#154792] tracking-tight">
          {t.hotlinesTitle}
        </h1>

        <div
          className={`grid grid-cols-1 ${
            isMobileView ? 'gap-5' : 'lg:grid-cols-12 gap-6'
          } items-start`}
        >
          <section className={`${isMobileView ? '' : 'lg:col-span-7'} space-y-4`}>
            <div className="flex items-center gap-2 text-[#154792]">
              <Megaphone className="w-5 h-5 text-[#1177F0]" />
              <h2 className="text-lg font-extrabold">Municipal Notices</h2>
            </div>

            {user?.role === 'lgu_officer' && (
              <form
                onSubmit={handlePublish}
                className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-5 space-y-3.5 shadow-sm"
              >
                <h3 className="text-sm font-extrabold text-[#154792]">
                  Publish San Mateo Notice
                </h3>
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CityAnnouncement['category'])}
                    className="px-3 py-2 text-xs font-semibold bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                  >
                    <option value="Municipal Notice">Municipal Notice</option>
                    <option value="Road Closure">Road Closure</option>
                    <option value="Planned Maintenance">Planned Maintenance</option>
                    <option value="Weather Advisory">Weather Advisory</option>
                  </select>
                  <input
                    type="text"
                    value={barangayScope}
                    onChange={(e) => setBarangayScope(e.target.value)}
                    placeholder="Affected barangays"
                    className="px-3 py-2 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Headline (e.g., Temporary Road Closure on Gen. Luna Ave.)"
                  className="w-full px-3 py-2 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                />
                <textarea
                  rows={2}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notice details..."
                  className="w-full px-3 py-2 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-4 py-2 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {publishing ? 'Publishing...' : 'Publish Live Notice'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {announcements.map((ann) => (
                <article
                  key={ann.id}
                  className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] p-5 space-y-2 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FBE95C] text-[#154792] font-extrabold text-[11px]">
                      {ann.category} · {ann.barangayScope}
                    </span>
                    <span className="font-mono font-semibold text-[#4679C0] tabular-nums">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#154792]">{ann.title}</h3>
                  <p className="text-sm text-[#154792]/80 leading-relaxed">{ann.message}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${isMobileView ? '' : 'lg:col-span-5'} space-y-4`}>
            <div className="flex items-center gap-2 text-[#154792]">
              <ShieldAlert className="w-5 h-5 text-[#1177F0]" />
              <h2 className="text-lg font-extrabold">Emergency Hotlines</h2>
            </div>

            <div className="bg-[#FEFFFE] rounded-2xl border border-[#d6e4f7] divide-y divide-[#F3F7FD] overflow-hidden shadow-sm">
              {EMERGENCY_HOTLINES.map((hotline) => (
                <div key={hotline.number} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-[#154792]">{hotline.name}</h3>
                    <p className="text-xs text-[#4679C0]">{hotline.scope}</p>
                  </div>
                  <a
                    href={`tel:${hotline.number.replace(/[^0-9+]/g, '')}`}
                    className="px-3.5 py-2 rounded-xl bg-[#FBE95C] hover:bg-[#f7e135] text-[#154792] font-mono text-xs font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    {hotline.number}
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};
