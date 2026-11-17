import React, { useState } from 'react';
import { FestState, DonationRecord, UserSession } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import {
  HeartHandshake,
  Copy,
  Check,
  Landmark,
  Smartphone,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface DonationPortalViewProps {
  state: FestState;
  session: UserSession | null;
  onRefreshState: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export const DonationPortalView: React.FC<DonationPortalViewProps> = ({
  state,
  session,
  onRefreshState,
}) => {
  const isAdmin = session?.role === 'admin';
  const s = state.settings;
  const ds = s.donationSettings || {
    enabled: true,
    fundGoal: 150000,
    upiId: 'ifest2027@irshadcollege',
    upiName: 'I-FEST 2027 Organizing Committee',
    bankName: 'Federal Bank · Irshad Campus Branch',
    accountNumber: '10290100456814',
    ifscCode: 'FDRL0001029',
    accountHolder: 'Irshad Talent Feista Committee',
    donationNote: 'Every contribution directly supports stage infrastructure, winner trophies, hospitality, and student awards.',
  };

  const donations = Array.isArray(state.donations) ? state.donations : [];

  // Copy states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Contribution form states
  const [donorName, setDonorName] = useState('');
  const [donorRole, setDonorRole] = useState<DonationRecord['donorRole']>('Alumni');
  const [amount, setAmount] = useState<string>('1000');
  const [paymentMethod, setPaymentMethod] = useState<DonationRecord['paymentMethod']>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [purpose, setPurpose] = useState('General Fest Fund');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [recentReceipt, setRecentReceipt] = useState<DonationRecord | null>(null);

  // Ledger search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Verified' | 'Pending Verification'>('All');

  const verifiedDonations = donations.filter((d) => d.status === 'Verified');
  const pendingDonations = donations.filter((d) => d.status === 'Pending Verification');
  const totalVerifiedAmount = verifiedDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
  const totalPledgedAmount = donations.reduce((acc, d) => acc + (d.amount || 0), 0);
  const goalProgressPct = ds.fundGoal > 0 ? Math.min(100, Math.round((totalVerifiedAmount / ds.fundGoal) * 100)) : 0;

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const handleSubmitDonation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!donorName.trim()) {
      setFormError('Please enter donor or well-wisher name.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive contribution amount.');
      return;
    }

    const res = FestStorageService.addDonation(
      {
        donorName: donorName.trim(),
        donorRole,
        amount: Math.round(parsedAmount),
        currency: 'INR',
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        purpose,
        message: message.trim() || undefined,
      },
      session?.role || 'public'
    );

    if (!res.success || !res.record) {
      setFormError(res.error || 'Could not record contribution.');
      return;
    }

    setRecentReceipt(res.record);
    setDonorName('');
    setTransactionRef('');
    setMessage('');
    onRefreshState();
  };

  const handleDownloadReceipt = (record: DonationRecord) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText('OFFICIAL CONTRIBUTION ACKNOWLEDGEMENT', 64, 92);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(s.festName, 64, 146);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(s.collegeName, 64, 180);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 210);
    ctx.lineTo(936, 210);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Contributor: ${record.donorName} (${record.donorRole})`, 64, 265);
    ctx.fillText(`Contribution Purpose: ${record.purpose || 'General Fest Fund'}`, 64, 305);
    ctx.fillText(`Payment Method: ${record.paymentMethod}${record.transactionRef ? ` · Ref: ${record.transactionRef}` : ''}`, 64, 345);
    ctx.fillText(`Status: ${record.status}`, 64, 385);
    ctx.fillText(`Date: ${new Date(record.createdAt).toLocaleString()}`, 64, 425);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 56px "JetBrains Mono", monospace';
    ctx.fillText(formatINR(record.amount), 936, 310);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Receipt ID: ${record.id} · Thank you for empowering student talent at ${s.festName}.`, 64, 560);

    const link = document.createElement('a');
    link.download = `IFEST_Contribution_${record.donorName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDonations = donations.filter((d) => {
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesSearch =
      d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.donorRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.transactionRef || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(ds.upiId)}&pn=${encodeURIComponent(ds.upiName)}&am=${encodeURIComponent(amount || '500')}&cu=INR&tn=${encodeURIComponent(`${s.festName} Contribution`)}`;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Community Patronage · Open Without Login
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            {getAppLabel(s, 'donateSectionHeading')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {getAppLabel(s, 'donateSectionSubtitle')}
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 tabular-nums">
          Total Recorded Entries: <strong className="text-white">{donations.length}</strong>
        </div>
      </div>

      {/* Fund KPI Summary Strip */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-slate-400 font-medium">Verified Funds Raised</div>
            <div className="text-3xl font-black text-amber-400 font-mono-num tabular-nums mt-1">
              {formatINR(totalVerifiedAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
              Goal: {formatINR(ds.fundGoal)} ({goalProgressPct}%)
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium">Total Including Pledges</div>
            <div className="text-3xl font-black text-white font-mono-num tabular-nums mt-1">
              {formatINR(totalPledgedAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
              {pendingDonations.length} awaiting admin confirmation
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium">Patrons &amp; Alumni Supporters</div>
            <div className="text-3xl font-black text-cyan-400 font-mono-num tabular-nums mt-1">
              {donations.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              100% transparent public ledger
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${goalProgressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{ds.donationNote}</p>
        </div>
      </div>

      {/* Two-Column Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Payment Channels + Contribution Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official Payment Channels */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              Official Transfer Details
            </h3>

            {/* UPI ID */}
            <div className="space-y-2 pb-4 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Official UPI ID</span>
                <span className="text-slate-500 truncate">{ds.upiName}</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-mono text-sm font-bold text-amber-300 truncate">{ds.upiId}</span>
                <button
                  type="button"
                  onClick={() => copyText('upi', ds.upiId)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 shrink-0"
                >
                  {copiedKey === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'upi' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <a
                href={upiDeepLink}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay via UPI App ({formatINR(Number(amount) || 500)})</span>
              </a>
            </div>

            {/* Bank Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                <span>Direct Bank Transfer (NEFT / IMPS)</span>
              </div>
              <div className="space-y-2 text-slate-400 font-mono">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>Account Name:</span>
                  <span className="text-white text-right">{ds.accountHolder}</span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span>Bank:</span>
                  <span className="text-slate-200 text-right">{ds.bankName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Account #:</span>
                  <button
                    type="button"
                    onClick={() => copyText('acc', ds.accountNumber)}
                    className="min-h-[36px] px-2 -mr-2 rounded-lg text-cyan-300 hover:text-cyan-200 hover:bg-slate-800/60 flex items-center gap-1.5"
                  >
                    <span>{ds.accountNumber}</span>
                    {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>IFSC Code:</span>
                  <button
                    type="button"
                    onClick={() => copyText('ifsc', ds.ifscCode)}
                    className="min-h-[36px] px-2 -mr-2 rounded-lg text-cyan-300 hover:text-cyan-200 hover:bg-slate-800/60 flex items-center gap-1.5"
                  >
                    <span>{ds.ifscCode}</span>
                    {copiedKey === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Record / Submit Contribution Form */}
          <form onSubmit={handleSubmitDonation} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                Record Your Fund Contribution
              </h3>
              <p className="text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Admin mode: Recorded contributions are marked Verified immediately.'
                  : 'Submit payment details or pledge without logging in for transparent committee verification.'}
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                {formError}
              </div>
            )}

            {recentReceipt && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Contribution Recorded!
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(recentReceipt)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  {recentReceipt.donorName} · {formatINR(recentReceipt.amount)} · {recentReceipt.status}
                </p>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contributor / Organization Name</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Ayesha Rahman (2020 Batch)"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Affiliation</label>
                <select
                  value={donorRole}
                  onChange={(e) => setDonorRole(e.target.value as DonationRecord['donorRole'])}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Alumni">Alumni</option>
                  <option value="Well-Wisher">Well-Wisher</option>
                  <option value="Sponsor">Sponsor</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Student">Student</option>
                  <option value="Public">Public Patron</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as DonationRecord['paymentMethod'])}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cash Pledge">Cash Pledge</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Amount (INR)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setAmount(String(amt))}
                    className={`min-h-[42px] py-2 rounded-xl font-mono font-bold transition-colors ${
                      Number(amount) === amt
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Fund Allocation</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="General Fest Fund">General Fest Fund</option>
                  <option value="Winner Trophies & Awards">Winner Trophies &amp; Awards</option>
                  <option value="Stage & Sound Infrastructure">Stage &amp; Sound</option>
                  <option value="Student Hospitality">Student Hospitality</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Transaction / UTR Ref</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Optional UTR / Ref #"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Goodwill Message (Optional)</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share a note of encouragement for the participants..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>{isAdmin ? 'Record Verified Contribution' : 'Submit Contribution Record'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Transparent Public Ledger */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Transparent Contributions Ledger</h3>
              <p className="text-xs text-slate-400">
                Publicly auditable record of fest contributions managed by the Executive Committee.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] overflow-x-auto scroll-touch shrink-0">
              {(['All', 'Verified', 'Pending Verification'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'Pending Verification' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contributor, alumni batch, purpose, UTR..."
              className="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="divide-y divide-slate-800/80">
            {filteredDonations.map((don) => (
              <div key={don.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{don.donorName}</span>
                    <span className="text-xs text-slate-500" aria-hidden="true">·</span>
                    <span className="text-xs text-cyan-300 font-medium">{don.donorRole}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>{don.purpose || 'General Fest Fund'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{don.paymentMethod}</span>
                    {don.transactionRef && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Ref: {don.transactionRef}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{new Date(don.createdAt).toLocaleDateString()}</span>
                  </div>

                  {don.message && (
                    <p className="text-xs text-slate-300 italic pt-0.5">&ldquo;{don.message}&rdquo;</p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-lg font-black text-amber-400 font-mono-num tabular-nums">
                    {formatINR(don.amount)}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {don.status === 'Verified' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(don)}
                      title="Download Contribution Receipt"
                      aria-label={`Download receipt for ${don.donorName}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            FestStorageService.verifyDonation(
                              don.id,
                              don.status === 'Verified' ? 'Pending Verification' : 'Verified'
                            );
                            onRefreshState();
                          }}
                          title={don.status === 'Verified' ? 'Mark Pending' : 'Verify Contribution'}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{don.status === 'Verified' ? 'Unverify' : 'Verify'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            FestStorageService.deleteDonation(don.id);
                            onRefreshState();
                          }}
                          title="Delete Entry"
                          aria-label={`Delete donation by ${don.donorName}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredDonations.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <HeartHandshake className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                <p>No contributions match your filter yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
