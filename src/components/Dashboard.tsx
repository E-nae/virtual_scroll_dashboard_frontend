'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
  Column,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Loader2, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types & API ---
type Status = 'success' | 'processing' | 'pending' | 'failed';

type Payment = {
  id: string;
  No: number;
  amount: number;
  status: Status;
  email: string;
  date: string;
};

const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: 'success', label: '완료', color: 'var(--st-success)' },
  { key: 'processing', label: '처리 중', color: 'var(--st-processing)' },
  { key: 'pending', label: '대기', color: 'var(--st-pending)' },
  { key: 'failed', label: '실패', color: 'var(--st-failed)' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s])) as Record<Status, (typeof STATUSES)[number]>;

const ROW_HEIGHT = 44;
const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fetchPayments = async (status: string | null, search: string | null) => {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);

  const { data } = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_ENDPOINT}/api/payments?${params.toString()}`);
  return (data ?? []).map((item: Payment, idx: number) => ({ ...item, No: idx + 1 })) as Payment[];
};

function SortHeader({ column, children, align = 'left' }: { column: Column<Payment>; children: React.ReactNode; align?: 'left' | 'right' }) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-sm hover:text-ink',
        align === 'right' && 'flex-row-reverse',
        sorted && 'text-ink',
      )}
      aria-label={`${typeof children === 'string' ? children : ''} 정렬`}
    >
      {children}
      <Icon className={cn('h-3.5 w-3.5', !sorted && 'opacity-40 group-hover:opacity-80')} />
    </button>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
  const [localSearch, setLocalSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));
  const [sorting, setSorting] = useState<SortingState>([]);

  // 타이핑이 멈추고 0.5초 뒤에 URL 업데이트
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) setSearch(localSearch || null);
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, search, setSearch]);

  // 표에 쓰는 데이터 (상태 + 검색어 필터)
  const { data = [], isFetching, isLoading, isError, refetch } = useQuery({
    queryKey: ['payments', statusFilter, search],
    queryFn: () => fetchPayments(statusFilter, search),
    placeholderData: prev => prev,
  });

  // 분포 띠에 쓰는 데이터 (검색어만 적용). 상태가 'all'이면 위 쿼리와 캐시를 공유
  const { data: allForSearch = [] } = useQuery({
    queryKey: ['payments', 'all', search],
    queryFn: () => fetchPayments('all', search),
    placeholderData: prev => prev,
  });

  const isSearchPending = isFetching || localSearch !== search;

  const distribution = useMemo(() => {
    const counts: Record<Status, number> = { success: 0, processing: 0, pending: 0, failed: 0 };
    allForSearch.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return { counts, total: allForSearch.length };
  }, [allForSearch]);

  const columns = useMemo<ColumnDef<Payment>[]>(() => [
    {
      accessorKey: 'No',
      header: 'No.',
      cell: i => <span className="text-ink-soft">{i.getValue<number>()}</span>,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <SortHeader column={column}>이메일</SortHeader>,
      cell: i => <span className="block truncate">{i.getValue<string>()}</span>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <SortHeader column={column}>결제일</SortHeader>,
      cell: i => {
        const v = i.getValue<string>();
        return <span className="text-ink-soft">{v ? dateFmt.format(new Date(v)) : ''}</span>;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <SortHeader column={column} align="right">금액</SortHeader>,
      cell: i => moneyFmt.format(Number(i.getValue())),
      sortingFn: (a, b) => Number(a.original.amount) - Number(b.original.amount),
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: info => {
        const s = STATUS_MAP[info.getValue() as Status];
        if (!s) return info.getValue<string>();
        return (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  const activeStatus = statusFilter !== 'all' ? STATUS_MAP[statusFilter as Status] : null;
  const toggleStatus = (key: Status) => setStatusFilter(statusFilter === key ? null : key);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[0.95] tracking-[-0.035em]">
            Payments
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
            최근 결제 내역 전체를 페이지 넘김 없이 한 목록에서 훑어볼 수 있어요.
          </p>
        </div>
        <p className="flex h-6 items-center gap-2 text-sm text-ink-soft" aria-live="polite">
          {isFetching ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />불러오는 중</>
          ) : (
            <><span className="h-1.5 w-1.5 rounded-full bg-st-success" aria-hidden />최신 상태</>
          )}
        </p>
      </header>

      {/* Distribution strip = status filter */}
      <section className="mt-10" aria-label="상태별 분포와 필터">
        <div className="flex h-3 w-full gap-[3px] overflow-hidden" aria-hidden>
          {distribution.total === 0 ? (
            <div className="h-full w-full rounded-[3px] bg-rule" />
          ) : (
            STATUSES.map(s => {
              const n = distribution.counts[s.key];
              if (!n) return null;
              const dim = activeStatus && activeStatus.key !== s.key;
              return (
                <div
                  key={s.key}
                  className="h-full rounded-[3px] transition-[flex-grow,opacity] duration-500 ease-out"
                  style={{ flexGrow: n, flexBasis: 0, background: s.color, opacity: dim ? 0.18 : 1 }}
                />
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-1 gap-y-2" role="group" aria-label="상태 필터">
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            aria-pressed={!activeStatus}
            className={cn(
              'rounded-md px-3 py-2 text-left transition-colors',
              !activeStatus ? 'bg-ink text-sheet' : 'hover:bg-rule/60',
            )}
          >
            <span className="block text-[13px] leading-none opacity-75">전체</span>
            <span className="mt-1.5 block font-display text-xl font-semibold leading-none tabular-nums">
              {distribution.total.toLocaleString()}
            </span>
          </button>
          {STATUSES.map(s => {
            const n = distribution.counts[s.key];
            const pressed = activeStatus?.key === s.key;
            const pct = distribution.total ? Math.round((n / distribution.total) * 100) : 0;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleStatus(s.key)}
                aria-pressed={pressed}
                className={cn(
                  'rounded-md px-3 py-2 text-left transition-colors',
                  pressed ? 'bg-sheet shadow-[inset_0_0_0_1.5px_var(--ink)]' : 'hover:bg-rule/60',
                )}
              >
                <span className="flex items-center gap-1.5 text-[13px] leading-none text-ink-soft">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
                <span className="mt-1.5 flex items-baseline gap-1.5 leading-none">
                  <span className="font-display text-xl font-semibold tabular-nums">{n.toLocaleString()}</span>
                  <span className="text-xs tabular-nums text-ink-soft">{pct}%</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ledger */}
      <section className="mt-8 flex h-[min(640px,72vh)] flex-col overflow-hidden rounded-xl border border-rule bg-sheet">
        <div className="flex items-center gap-3 border-b border-rule px-3 py-3 sm:px-4">
          <label className="relative flex-1 sm:max-w-sm">
            <span className="sr-only">이메일 검색</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {isSearchPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </span>
            <input
              className="h-10 w-full rounded-lg bg-paper pl-9 pr-9 text-sm placeholder:text-ink-soft/80 focus:bg-white focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus)]"
              placeholder="이메일로 검색"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          {activeStatus && (
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink sm:inline-flex"
            >
              {activeStatus.label}만 보는 중
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">, 필터 해제</span>
            </button>
          )}
        </div>

        <div
          ref={tableContainerRef}
          className="relative flex-1 overflow-auto"
          role="table"
          aria-rowcount={rows.length + 1}
          aria-label="결제 내역"
        >
          {table.getHeaderGroups().map(hg => (
            <div
              key={hg.id}
              role="row"
              className="ledger-row sticky top-0 z-10 h-10 border-b border-rule bg-sheet/95 text-[13px] text-ink-soft backdrop-blur-sm"
            >
              {hg.headers.map(h => (
                <div key={h.id} role="columnheader" className={cn('ledger-cell', `col-${h.column.id}`)}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </div>
              ))}
            </div>
          ))}

          {isLoading ? (
            <div className="flex h-[calc(100%-40px)] items-center justify-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> 결제 내역을 불러오는 중
            </div>
          ) : isError ? (
            <div className="flex h-[calc(100%-40px)] flex-col items-center justify-center gap-3 px-6 text-center text-sm">
              <p className="text-ink-soft">결제 내역을 불러오지 못했어요. 서버 연결을 확인한 뒤 다시 시도해 주세요.</p>
              <button type="button" onClick={() => refetch()} className="rounded-lg bg-ink px-4 py-2 text-sheet">
                다시 불러오기
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-[calc(100%-40px)] flex-col items-center justify-center gap-3 px-6 text-center text-sm">
              <p className="text-ink-soft">
                {search ? <>‘{search}’가 들어간 이메일이 없어요.</> : '조건에 맞는 결제가 없어요.'}
              </p>
              <button
                type="button"
                onClick={() => { setLocalSearch(''); setSearch(null); setStatusFilter(null); }}
                className="rounded-lg border border-rule px-4 py-2 hover:bg-paper"
              >
                필터 모두 지우기
              </button>
            </div>
          ) : (
            <div role="rowgroup" className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
              {virtualItems.map(vr => {
                const row = rows[vr.index];
                return (
                  <div
                    key={row.id}
                    role="row"
                    aria-rowindex={vr.index + 2}
                    className="ledger-row absolute inset-x-0 top-0 border-b border-rule/70 text-sm hover:bg-paper/70"
                    style={{ height: ROW_HEIGHT, transform: `translateY(${vr.start}px)` }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <div key={cell.id} role="cell" className={cn('ledger-cell', `col-${cell.column.id}`)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-2.5 text-xs text-ink-soft">
          <span className="tabular-nums">
            {rows.length.toLocaleString()}건 중 지금 화면에 그리는 행은 {virtualItems.length}개
          </span>
          <span className="hidden sm:inline">필터와 검색어는 URL에 남아서 링크로 그대로 공유돼요</span>
        </div>
      </section>
    </div>
  );
}
