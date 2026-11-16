import { emiWord } from '../lib/region';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addMonths, insights, series, summarize } from '../engine/cashflow';
import { planGoal } from '../engine/goals';
import { Icon, type IconName } from '../components/icons';
import { Callout, Card, Empty } from '../components/ui';
import { HBars, IncomeSpendChart, StackedBar } from '../components/charts';
import { money, moneyCompact, moneyExact, monthLabel, monthLong, monthsText, pct } from '../lib/format';
import { features } from '../features';
import { cascade } from '../motion';
import { useStore } from '../store';

export const GROUP_COLOR = { income: 'var(--chart-deep)', needs: 'var(--chart-mid)', wants: 'var(--chart-light)', savings: 'var(--chart-deep)' } as const;
export const CLASS_COLOR = { equity: 'var(--s1)', debt: 'var(--s2)', cash: 'var(--s3)', gold: 'var(--s4)', other: 'var(--s5)' } as const;

type PillTone = 'good' | 'watch' | 'bad' | 'plain';

/** One of the three summary cards: an icon tile and title, one big figure with a pill, a couple of small figures, and a round button that opens the screen behind it. */
function StatCard(props: {
  feature?: boolean;
  icon: IconName;
  title: string;
  subtitle: string;
  value: ReactNode;
  pill?: { text: string; tone: PillTone };
  stats: Array<{ label: string; value: string }>;
  open: string;
  onOpen: () => void;
}) {
  return (
    <section className={`card stat-card ${props.feature ? 'feature' : ''}`}>
      <div className="stat-head">
        <span className="icon-tile"><Icon name={props.icon} size={32} /></span>
        <div>
          <div className="stat-title">{props.title}</div>
          <div className="stat-sub">{props.subtitle}</div>
        </div>
      </div>
      <div className="stat-big num">
        {props.value}
        {props.pill && <span className={`dpill ${props.pill.tone}`}>{props.pill.text}</span>}
      </div>
      <div className="stat-foot">
        <dl className="stat-figs">
          {props.stats.map((x) => <div key={x.label}><dt>{x.label}</dt><dd className="num">{x.value}</dd></div>)}
        </dl>
        <button className="round-go" aria-label={props.open} title={props.open} onClick={props.onOpen}><Icon name="f-arrow-up-right" size={24} /></button>
      </div>
    </section>
  );
}

const RANGES = ['1', '3', '6', '9', '12'] as const;
type Range = (typeof RANGES)[number];

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const { state, d } = useStore();
  const [month, setMonth] = useState(d.latestMonth);
  const [range, setRange] = useState<Range>('6');
  const cur = useMemo(() => summarize(state.txns, month), [state.txns, month]);
  const prev = useMemo(() => summarize(state.txns, addMonths(month, -1)), [state.txns, month]);
  const trend = useMemo(() => series(state.txns, month, Number(range)), [state.txns, month, range]);
  const notes = useMemo(() => insights(state.txns, month), [state.txns, month]);
  const recent = useMemo(() => [...state.txns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [state.txns]);
  const page = useRef<HTMLDivElement>(null);
  const first = state.profile.name.trim().split(/\s+/)[0];
  const greeting = first ? `Welcome back, ${first}!` : 'Overview';
  // The summary cards arrive one after another, once each time the Dashboard opens (not when the month changes).
  useEffect(() => { if (page.current) cascade(page.current.querySelectorAll('.sumgrid > *')); }, []);

  if (state.txns.length === 0 && (!features.investing || state.investments.length === 0) && state.goals.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{greeting}</h1>
            <div className="sub">Add something below and this page fills in.</div>
          </div>
        </div>
        <Empty title="Nothing here yet">
          <p style={{ marginBottom: 14 }}>Add a transaction, import a bank statement, or connect a Google Sheet, and this page fills in with your own numbers.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => go('add-transaction')}>Add a transaction</button>
            <button className="btn" onClick={() => go('transactions')}>Import or connect a sheet</button>
          </div>
        </Empty>
      </div>
    );
  }

  const p = d.portfolio;
  const ctx = { today: d.today, rates: d.rates, monthlyIncome: d.plan.income, existingEmi: d.plan.existingEmi, marginal: d.marginal, annualIncome: state.profile.annualGrossIncome };
  const hasData = cur.txnCount > 0;
  const needsPct = cur.income > 0 ? cur.needs / cur.income : 0;
  const wantsPct = cur.income > 0 ? cur.wants / cur.income : 0;
  const savePct = cur.income > 0 ? cur.saved / cur.income : 0;
  const saveTone: PillTone = cur.income <= 0 ? 'plain' : savePct >= 0.2 ? 'good' : savePct >= 0 ? 'watch' : 'bad';
  const rangeSaved = trend.reduce((a, t) => a + t.saved, 0);

  const nextGoal = [...state.goals].sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))[0];
  const goalPlan = nextGoal ? planGoal(nextGoal, ctx) : null;

  const leftDelta = cur.saved - prev.saved;
  const hasPrev = prev.txnCount > 0;
  const emiShare = d.plan.income > 0 ? d.plan.existingEmi / d.plan.income : 0;

  return (
    <div className="page" ref={page}>
      <div className="page-head">
        <div>
          <h1 className="display">{greeting}</h1>
          <div className="sub">Overview of your money for {monthLong(month)}</div>
        </div>
        <div className="month-pill" role="group" aria-label="Month">
          <button className="btn icon small ghost" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>&larr;</button>
          <span className="month-pill-label"><Icon name="f-calendar" size={24} /><b>{monthLong(month)}</b></span>
          <button className="btn icon small ghost" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>&rarr;</button>
        </div>
      </div>

      {!hasData && <Callout tone="info">No transactions in {monthLabel(month)}. Use the arrows to move to a month with data, or add transactions.</Callout>}

      <div className="sumgrid">
        <StatCard
          feature icon="f-wallet" title="Left over" subtitle="Income minus spend"
          value={money(cur.saved)} pill={cur.income > 0 ? { text: `${pct(savePct * 100, 0)} saved`, tone: saveTone } : undefined}
          stats={[{ label: 'Income', value: money(cur.income) }, { label: 'Spent', value: money(cur.spend) }, ...(features.investing ? [{ label: 'Invested', value: money(cur.invested) }] : [])]}
          open="See where it went" onOpen={() => go('transactions')}
        />
        {features.investing ? (
          <StatCard
            icon="f-cash" title="Net worth" subtitle="Assets minus what you owe"
            value={moneyCompact(p.netWorth)} pill={p.total > 0 ? { text: `${pct(p.blendedPosttax)} after tax`, tone: 'plain' } : undefined}
            stats={[{ label: 'Assets', value: moneyCompact(p.total) }, { label: 'Liabilities', value: moneyCompact(p.liabilities) }]}
            open="Analyze performance" onOpen={() => go('investments')}
          />
        ) : (
          <StatCard
            icon="f-bank" title="Loans" subtitle={state.liabilities.length ? `${state.liabilities.length} active loan${state.liabilities.length === 1 ? '' : 's'}` : 'No loans recorded'}
            value={`${money(d.plan.existingEmi)}/m`}
            pill={d.plan.income > 0 && d.plan.existingEmi > 0 ? { text: `${pct(emiShare * 100, 0)} of income`, tone: emiShare > 0.4 ? 'bad' : emiShare > 0.3 ? 'watch' : 'good' } : undefined}
            stats={[{ label: 'Still owed', value: moneyCompact(p.liabilities) }]}
            open="See your loans" onOpen={() => go('goals')}
          />
        )}
        {goalPlan && nextGoal ? (
          <StatCard
            icon="f-goal" title="Goal" subtitle={`${nextGoal.name} . ${monthsText(goalPlan.months)} away`}
            value={`${money(goalPlan.requiredMonthly)}/m`}
            pill={goalPlan.loanAmount > 0 ? { text: goalPlan.verdict[0].toUpperCase() + goalPlan.verdict.slice(1), tone: goalPlan.verdict === 'comfortable' ? 'good' : goalPlan.verdict === 'stretch' ? 'watch' : 'bad' } : undefined}
            stats={[{ label: 'Save to have', value: money(goalPlan.upfront) }, ...(goalPlan.loanAmount > 0 ? [{ label: emiWord(true), value: money(goalPlan.emi) }] : [])]}
            open="View goals" onOpen={() => go('goals')}
          />
        ) : (
          <StatCard
            icon="f-goal" title="Goal" subtitle="Car, house, bike or trip" value="None yet"
            stats={[]} open="Add a goal" onOpen={() => go('goals')}
          />
        )}
      </div>

      <div className="dash-row">
        <section className="card">
          <div className="card-head-row">
            <div className="stat-head">
              <span className="icon-tile"><Icon name="f-cash" size={32} /></span>
              <div>
                <h2 className="stat-title">Cash flow</h2>
                <div className="stat-sub">Left over . Last {range} {range === '1' ? 'month' : 'months'}</div>
              </div>
            </div>
            <div className="range-toggle" role="group" aria-label="Range">
              {RANGES.map((r) => <button key={r} aria-pressed={range === r} aria-label={`${r} ${r === '1' ? 'month' : 'months'}`} onClick={() => setRange(r)}>{r} M</button>)}
            </div>
          </div>
          <div className="flow-figure">
            <span className={`bigfig num ${rangeSaved < 0 ? 'bad' : ''}`}>{money(rangeSaved)}</span>
            {hasPrev && leftDelta !== 0 && (
              <span className={`delta-pill ${leftDelta < 0 ? 'bad' : 'good'}`}>
                <span className={leftDelta < 0 ? '' : 'flip-y'} aria-hidden><Icon name="f-triangle-down" size={14} /></span>
                {money(Math.abs(leftDelta))} {leftDelta < 0 ? 'less' : 'more'} than last month
              </span>
            )}
          </div>
          <IncomeSpendChart data={trend.map((t) => ({ label: monthLabel(t.month, false), income: t.income, spend: t.spend, invested: t.invested }))} />
        </section>

        <section className="card">
          <div className="stat-head" style={{ display: 'block' }}>
            <h2 className="stat-title">Where the money went</h2>
            <div className="stat-sub">{monthLabel(month)} · {money(cur.spend + cur.invested)} total</div>
          </div>
          {cur.byCategory.length === 0 ? <p className="sub" style={{ marginTop: 12 }}>No spending recorded.</p> : (
            <>
              <HBars rows={cur.byCategory.slice(0, 10).map((c) => ({ label: c.category, value: c.amount, color: GROUP_COLOR[c.group] }))} total={cur.spend + cur.invested} />
              {cur.byCategory.length > 10 && <p className="sub" style={{ marginTop: 6 }}>Top 10 of {cur.byCategory.length} categories. Filter by category in Transactions for the rest.</p>}
              <div className="legend" style={{ marginTop: 10 }}>
                <span><i style={{ background: GROUP_COLOR.savings }} />Invested</span>
                <span><i style={{ background: GROUP_COLOR.wants }} />Wants</span>
                <span><i style={{ background: GROUP_COLOR.needs }} />Needs</span>
              </div>
            </>
          )}
        </section>
      </div>

      {recent.length > 0 && (
        <Card title="Recent activity" right={<button className="btn outline-accent" onClick={() => go('transactions')}>View all</button>}>
          <div className="table-wrap">
            <table className="table cards txn2">
              <thead><tr><th>Description</th><th className="c">Date</th><th className="c">Category</th><th className="c">Type</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="title" data-label="Description"><span className="d-title">{t.description || 'No description'}</span></td>
                    <td className="c" data-label="Date"><span className="num">{t.date}</span></td>
                    <td className="c" data-label="Category"><span className="pill">{t.category}</span></td>
                    <td className="c" data-label="Type"><span className={t.type === 'income' ? 'credit' : 'debit'}>{t.type === 'income' ? 'Credit' : 'Debit'}</span></td>
                    <td className="r" data-label="Amount"><span className="num">{t.type === 'income' ? '+' : '−'}{Number.isInteger(t.amount) ? money(t.amount) : moneyExact(t.amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid g2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))' }}>
        <Card title="50 / 30 / 20 check" sub="Guide: needs 50%, wants 30%, saving 20% of income">
          {cur.income > 0 ? (
            <dl className="kv">
              <dt>Needs <span className="muted small">(target 50%)</span></dt><dd className={needsPct > 0.5 ? 'watch' : 'good'}>{needsPct > 0.5 ? '! ' : '✓ '}{pct(needsPct * 100, 0)} &middot; {money(cur.needs)}</dd>
              <dt>Wants <span className="muted small">(target 30%)</span></dt><dd className={wantsPct > 0.3 ? 'watch' : 'good'}>{wantsPct > 0.3 ? '! ' : '✓ '}{pct(wantsPct * 100, 0)} &middot; {money(cur.wants)}</dd>
              <dt>Saved <span className="muted small">(target 20%+)</span></dt><dd className={savePct < 0.2 ? 'watch' : 'good'}>{savePct < 0.2 ? '! ' : '✓ '}{pct(savePct * 100, 0)} &middot; {money(cur.saved)}</dd>
            </dl>
          ) : <p className="sub">Needs income recorded for the month.</p>}
          <div style={{ marginTop: 14 }} className="stack">
            {notes.map((n, i) => <Callout key={i} tone={n.level}>{n.text}</Callout>)}
          </div>
        </Card>

        {features.investing && (
          <Card title="What you own" sub="By asset class" right={<button className="btn small" onClick={() => go('investments')}>Manage</button>}>
            {p.total > 0 ? (
              <StackedBar parts={[
                { label: 'Equity', value: p.byClass.equity, color: CLASS_COLOR.equity },
                { label: 'Debt', value: p.byClass.debt, color: CLASS_COLOR.debt },
                { label: 'Cash', value: p.byClass.cash, color: CLASS_COLOR.cash },
                { label: 'Gold', value: p.byClass.gold, color: CLASS_COLOR.gold },
                { label: 'Other', value: p.byClass.other, color: CLASS_COLOR.other },
              ]} />
            ) : <p className="sub">Add investments to see your mix.</p>}
            {p.holdings.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table className="table num">
                  <thead><tr><th>Largest holdings</th><th className="r">Value</th><th className="r">After tax and inflation</th></tr></thead>
                  <tbody>
                    {[...p.holdings].sort((a, b) => b.value - a.value).slice(0, 5).map((h) => (
                      <tr key={h.inv.id}>
                        <td>{h.inv.name}</td>
                        <td className="r" style={{ whiteSpace: 'nowrap' }}>{moneyCompact(h.value)}</td>
                        <td className={`r ${h.real < 0.5 ? 'bad' : ''}`} style={{ whiteSpace: 'nowrap' }}>{h.real < 0.5 ? '✕ ' : ''}{pct(h.real)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
