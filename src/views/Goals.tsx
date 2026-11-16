import { emiWord, emiWords, isIndia } from '../lib/region';
import { useEffect, useRef, useState } from 'react';
import bikeArt from '../assets/figma/goal-bike.png';
import carArt from '../assets/figma/goal-car.png';
import houseArt from '../assets/figma/goal-house.png';
import { dialogIn } from '../motion';
import { addMonths } from '../engine/cashflow';
import { earliestMonths, GOAL_DEFAULTS, newGoal, planGoal, type PlanContext } from '../engine/goals';
import type { Goal, GoalKind } from '../engine/types';
import { Icon, type IconName } from '../components/icons';
import { useToast } from '../components/feedback';
import { Badge, Callout, Card, Field, Num, NumInput } from '../components/ui';
import { money, moneyCompact, monthLabel, monthsText, pct, uid, cur } from '../lib/format';
import { features } from '../features';
import { useStore } from '../store';
import { LoansCard } from './Loans';

const CHOICES: Array<{ kind: GoalKind; icon: IconName; title: string; hint: string }> = [
  { kind: 'car', icon: 'car', title: 'Car', hint: 'Down payment, loan and running costs' },
  { kind: 'house', icon: 'house', title: 'House', hint: 'Down payment, home loan and fees' },
  { kind: 'bike', icon: 'bike', title: 'Bike', hint: 'A motorbike or scooter' },
  { kind: 'trip', icon: 'plane', title: 'Trip or vacation', hint: 'Flights, stay and spending money, saved in cash' },
  { kind: 'other', icon: 'target', title: 'Something else', hint: 'Any one-off purchase, saved for in cash' },
];

function GoalChooser({ onPick }: { onPick: (k: GoalKind) => void }) {
  return (
    <div className="chooser" role="group" aria-label="Choose what you are saving for">
      {CHOICES.map((c) => (
        <button key={c.kind} className="choice" onClick={() => onPick(c.kind)}>
          <span className="icon-tile"><Icon name={c.icon} size={22} /></span>
          <b>{c.title}</b>
          <span className="sub">{c.hint}</span>
        </button>
      ))}
    </div>
  );
}

const ART: Partial<Record<GoalKind, string>> = { bike: bikeArt, car: carArt, house: houseArt };
const ASK: Record<GoalKind, [string, string]> = {
  bike: ['Which bike?', 'Royal Enfield Bear 650'], car: ['Which car?', 'Hyundai Creta'], house: ['Which home?', '2 BHK, Whitefield'], trip: ['Where to?', 'Goa with friends'], other: ['What is it?', 'Laptop'],
};

/** The picture on a goal card: the illustration from the design, or an icon tile for goals that have none. */
function GoalArt({ kind, name }: { kind: GoalKind; name: string }) {
  const src = ART[kind];
  if (src) return <img className="goal-art" src={src} alt="" width={200} loading="lazy" />;
  return <span className="goal-art goal-art-tile" aria-hidden><Icon name={kind === 'trip' ? 'plane' : 'target'} size={64} /><span className="sr-only">{name}</span></span>;
}

export function Goals() {
  const { state, dispatch, d } = useStore();
  const { toast } = useToast();
  const [choosing, setChoosing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const ctx: PlanContext = { today: d.today, rates: d.rates, monthlyIncome: d.plan.income, existingEmi: d.plan.existingEmi, marginal: d.marginal, annualIncome: state.profile.annualGrossIncome };

  const add = (kind: GoalKind) => {
    const g = GOAL_DEFAULTS[kind];
    const goal = newGoal(kind, uid(), d.today, d.rates);
    dispatch({ type: 'upsertGoal', goal });
    setChoosing(false);
    setOpenId(goal.id);
    toast(`${g.name} goal added. Set its price and date, then press Save changes.`);
  };

  const plans = state.goals.map((g) => ({ g, p: planGoal(g, ctx) }));
  const surplus = Math.max(0, d.plan.income - d.plan.spend);
  const open = plans.find((x) => x.g.id === openId);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Goals</h1>
          <div className="sub">What you are saving for, and what it takes to get there</div>
        </div>
        <div className="head-actions">
          <button className="btn hero outline-accent" aria-expanded={choosing} onClick={() => setChoosing((c) => !c)}>
            <Icon name={choosing ? 'close' : 'plus'} size={18} />{choosing ? 'Cancel' : 'Add a goal'}
          </button>
        </div>
      </div>

      {state.goals.length > 0 && d.plan.income <= 0 && (
        <Callout tone="watch">Add your monthly take-home in Settings, or import some transactions, so I can tell whether your goals are affordable. Until then every loan looks unaffordable.</Callout>
      )}
      {state.goals.length > 0 && !isIndia(d.country) && !['homeLoan', 'carLoan', 'bikeLoan'].some((k) => k in state.overrides) && (
        <Callout tone="info">The loan rates and price growth below are placeholders, not figures for your country. Set the rate you were quoted in Settings, under Rates and assumptions.</Callout>
      )}

      {choosing && (
        <Card title="What are you saving for?" sub="Pick one. You can change every number afterwards.">
          <GoalChooser onPick={add} />
        </Card>
      )}

      {plans.length === 0 && !choosing && (
        <Card>
          <div className="empty-cta">
            <h2>No goals yet</h2>
            <p className="sub">Add a car, house, bike or trip. You will see the price at your target date, the cash needed up front, the monthly {emiWord()}, the total interest, and the monthly saving that gets you there.</p>
            <button className="btn" onClick={() => setChoosing(true)}><Icon name="plus" size={18} />Add your first goal</button>
          </div>
        </Card>
      )}

      {plans.map(({ g, p }) => (
        <section className="card goal-row" key={g.id} aria-label={g.name}>
          <GoalArt kind={g.kind} name={g.name} />
          <div className="goal-main">
            <div className="goal-top">
              <div>
                <h2 className="goal-name">{g.name}</h2>
                <div className="goal-when">{monthLabel(g.targetMonth)} ({monthsText(p.months)} away)</div>
              </div>
              <button className="btn ghost accent-text" aria-label={`View details of ${g.name}`} onClick={() => setOpenId(g.id)}>View Details</button>
            </div>
            <dl className="goal-figs">
              <div><dt>{g.kind === 'trip' ? 'Cost today' : 'Price today'}</dt><dd className="num">{money(g.price)}</dd></div>
              <div><dt>Save each month</dt><dd className="num">{money(p.requiredMonthly)}</dd></div>
              <div><dt>Cash needed on the day</dt><dd className="num">{money(p.upfront)}</dd></div>
              {p.loanAmount > 0 && <div><dt>{emiWord(true)} after</dt><dd className="num">{money(p.emi)}</dd></div>}
            </dl>
          </div>
        </section>
      ))}

      {open && <GoalDialog key={open.g.id} goal={open.g} ctx={ctx} surplus={surplus} others={plans.reduce((a, x) => a + (x.g.id === open.g.id ? 0 : x.p.requiredMonthly), 0)} onClose={() => setOpenId(null)} />}

      <LoansCard />
    </div>
  );
}

/** One goal's details: the fields on the left, the numbers on the right. Nothing is kept until Save changes. */
function GoalDialog({ goal, ctx, surplus, others, onClose }: { goal: Goal; ctx: PlanContext; surplus: number; others: number; onClose: () => void }) {
  const { dispatch } = useStore();
  const { toast } = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Goal>(goal);
  const [pace, setPace] = useState(Math.round(surplus / 4 / 1000) * 1000 || 10_000);
  useEffect(() => { const el = ref.current; if (el && !el.open) { el.showModal(); dialogIn(el); } }, []);
  const set = (patch: Partial<Goal>) => setDraft((g) => ({ ...g, ...patch }));
  const p = planGoal(draft, ctx);
  const growthKey = GOAL_DEFAULTS[draft.kind].growthKey;
  const months = earliestMonths(draft, pace, ctx);
  const hasLoan = p.loanAmount > 0;
  const cash = draft.kind === 'trip' || draft.kind === 'other';
  const tone = p.verdict === 'comfortable' ? 'good' : p.verdict === 'stretch' ? 'watch' : 'bad';
  const short = p.requiredMonthly - surplus;
  const changed = JSON.stringify(draft) !== JSON.stringify(goal);
  const [ask, example] = ASK[draft.kind];

  const save = () => { dispatch({ type: 'upsertGoal', goal: draft }); toast(`${draft.name} saved`); onClose(); };
  const remove = () => { dispatch({ type: 'deleteGoal', id: goal.id }); toast(`${goal.name} goal removed`, { undo: () => dispatch({ type: 'upsertGoal', goal }) }); onClose(); };

  return (
    <dialog ref={ref} className="modal goal-dialog" aria-labelledby="goal-title" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="goal-dialog-body">
        <div className="import-head">
          <h2 id="goal-title">{draft.name || GOAL_DEFAULTS[draft.kind].name}</h2>
          <button className="btn icon small ghost" aria-label="Close" onClick={onClose}><Icon name="f-close" size={20} /></button>
        </div>

        <div className="goal-cols">
          <div className="goal-form">
            <Field label={ask}><input value={draft.name} placeholder={example} onChange={(e) => set({ name: e.target.value })} /></Field>
            <div className="form-grid">
              <Num label={draft.kind === 'trip' ? `Total cost today (${cur()})` : `Price today (${cur()})`} value={draft.price} onChange={(n) => set({ price: n })} min={0} />
              <Field label={draft.kind === 'trip' ? 'Travel month' : 'Target month'}><input type="month" value={draft.targetMonth} onChange={(e) => e.target.value && set({ targetMonth: e.target.value })} /></Field>
              {!cash && <Num label="Down payment (%)" value={draft.downPaymentPct} onChange={(n) => set({ downPaymentPct: Math.min(100, n) })} min={0} />}
              {!cash && <Num label="Loan rate (%)" value={draft.loanRate} onChange={(n) => set({ loanRate: n })} min={0} hint="Ask your lender for the real quote" />}
              {!cash && <Num label="Loan tenure (years)" value={draft.loanYears} onChange={(n) => set({ loanYears: n })} min={0} />}
              {draft.kind !== 'other' && <Num label={draft.kind === 'trip' ? 'Spending money, visa, insurance (%)' : 'Fees, tax, insurance (%)'} value={draft.extraCostPct} onChange={(n) => set({ extraCostPct: n })} min={0} hint={draft.kind === 'house' ? 'Stamp duty + registration, varies by state' : draft.kind === 'trip' ? 'On top of the cost above' : 'Road tax, registration, insurance'} />}
              <Num label={`Already saved (${cur()})`} value={draft.saved} onChange={(n) => set({ saved: n })} min={0} />
            </div>
          </div>

          <div className="goal-numbers">
            <h3>The numbers</h3>
            <dl className="kv">
              <dt>{draft.kind === 'trip' ? 'Cost' : 'Price'} at {monthLabel(draft.targetMonth)} <span className="muted small">(+{dec(ctx.rates[growthKey])}%/yr)</span></dt><dd>{money(p.priceAtTarget)}</dd>
              {!cash && <><dt>Down payment ({draft.downPaymentPct}%)</dt><dd>{money(p.downPayment)}</dd></>}
              {draft.kind !== 'other' && <><dt>{draft.kind === 'trip' ? 'Spending money, visa, insurance' : 'Fees, tax, insurance'} ({draft.extraCostPct}%)</dt><dd>{money(p.extraCost)}</dd></>}
              <dt className="strong">Cash needed on the day</dt><dd className="strong">{money(p.upfront)}</dd>
              {hasLoan && <><dt>Loan</dt><dd>{money(p.loanAmount)}</dd>
                <dt>{emiWord(true)} ({draft.loanRate}% · {draft.loanYears} yr)</dt><dd className="strong">{money(p.emi)}</dd>
                <dt>Total interest</dt><dd className={p.interest > p.priceAtTarget * 0.25 ? 'watch' : ''}>{money(p.interest)}</dd></>}
              {!cash && <><dt>Total cost of ownership</dt><dd>{money(p.lifetimeCost)}</dd></>}
            </dl>
          </div>
        </div>

        <div className="goal-verdict">
          {p.requiredMonthly > 0 && <Badge tone={short > 0 ? 'bad' : 'good'}>{short > 0 ? `✕ ${money(short)} a month more than your surplus` : '✓ Fits your surplus'}</Badge>}
          {hasLoan && tone !== 'good' && <Badge tone={tone}>{tone === 'watch' ? '!' : '✕'} {emiWords()} would be {pct(p.foir * 100, 0)} of income</Badge>}
          <span className="sub">Judged on its own.{others > 0 && p.requiredMonthly > 0 ? ` Your other goals also draw ${money(others)} a month from the same surplus.` : ''}</span>
        </div>

        <details className="goal-more">
          <summary>Checks and options</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            <p className="sub">
              {p.requiredMonthly > 0
                ? features.investing
                  ? <>Put aside <b className="num">{money(p.requiredMonthly)}</b> a month in a <b>{p.vehicle.toLowerCase()}</b> (about {pct(p.vehicleReturn)} a year after tax). {draft.kind === 'trip' ? 'A trip date does not move, so keep this out of equity.' : p.years < 3 ? 'The date is under 3 years away, so keep this out of equity: a market fall right before purchase would hurt.' : 'The date is 3+ years away, so some market exposure is reasonable.'}</>
                  : <>Put aside <b className="num">{money(p.requiredMonthly)}</b> a month. This assumes your savings grow about {pct(p.vehicleReturn)} a year after tax; saving more or sooner shortens the wait.</>
                : 'You already have enough set aside for the up-front cash.'}
            </p>
            <div className="row">
              <span className="sub">If I save</span>
              <div style={{ width: 130 }}><NumInput className="inline-input" value={pace} onChange={setPace} aria-label="Monthly saving" /></div>
              <span className="sub">a month, I can pay the {draft.kind === 'trip' ? 'trip cost' : 'up-front cash'} in <b>{monthsText(months)}</b>{Number.isFinite(months) ? ` (${monthLabel(addMonths(ctx.today.slice(0, 7), months))})` : ''}.</span>
            </div>
            {p.checks.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>Sanity checks</h3>
                <ul className="clean">{p.checks.map((c) => <li key={c.label}><Callout tone={c.ok ? 'good' : 'watch'}><b>{c.label}.</b> {c.detail}</Callout></li>)}</ul>
              </div>
            )}
            {hasLoan && p.tenures.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>Tenure trade-off</h3>
                <div className="table-wrap">
                  <table className="table num">
                    <thead><tr><th>Tenure</th><th className="r">{emiWord(true)}</th><th className="r">Total interest</th><th className="r">Interest as % of loan</th><th>Fits income?</th></tr></thead>
                    <tbody>
                      {p.tenures.map((t) => (
                        <tr key={t.years} style={t.years === draft.loanYears ? { background: 'var(--surface-2)' } : undefined}>
                          <td>{t.years} {t.years === 1 ? 'year' : 'years'} {t.years === draft.loanYears && <Badge>current</Badge>}</td>
                          <td className="r">{money(t.emi)}</td>
                          <td className="r">{moneyCompact(t.interest)}</td>
                          <td className="r">{pct((t.interest / p.loanAmount) * 100, 0)}</td>
                          <td><Badge tone={t.verdict === 'comfortable' ? 'good' : t.verdict === 'stretch' ? 'watch' : 'bad'}>{t.verdict === 'comfortable' ? '✓' : t.verdict === 'stretch' ? '!' : '✕'} {t.verdict} · {pct(t.foir * 100, 0)}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </details>

        <div className="goal-actions">
          <button className="btn ghost danger-text" onClick={remove}><Icon name="f-trash" size={20} />Remove goal</button>
          <button className="btn hero primary" disabled={!changed} onClick={save}>Save changes</button>
        </div>
      </div>
    </dialog>
  );
}

const dec = (n: number) => (Number.isFinite(n) ? +n.toFixed(1) : 0);
