'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useQueryState, parseAsString } from 'nuqs'; // Next.js 전용 훅
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Search, ArrowUpDown, Filter, Loader2, Server } from 'lucide-react';
import { cn } from '@/lib/utils'; // shadcn utils

// --- Types & API ---
type Payment = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
  date: string;
};

const fetchPayments = async (status: string | null, search: string | null) => {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);
  
  // Node.js 백엔드 호출
  const { data } = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_ENDPOINT}/api/payments?${params.toString()}`);
  const newData = data?.map((item: Payment, idx: number)=> {return {...item, No: idx + 1}})
  return newData as Payment[];
};

export default function Dashboard() {
  // 1. Nuqs: URL Query String Sync
  // URL의 ?search=...&status=... 와 이 변수들이 자동으로 동기화
    // 1. 상태 관리
    const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
    const [localSearch, setLocalSearch] = useState(search);  
    const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));
    
    const [sorting, setSorting] = useState<SortingState>([]);

    // 디바운싱 효과 (타자가 멈추고 0.5초 뒤에 URL 업데이트)
    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearch !== search) setSearch(localSearch || null);
        }, 500);
        return () => clearTimeout(handler);
    }, [localSearch, search, setSearch]);
  
    // 2. React Query: Server State Management
    // 3. 데이터 페칭
    const { data = [], isFetching, isLoading } = useQuery({
        queryKey: ['payments', statusFilter, search],
        queryFn: () => fetchPayments(statusFilter, search),
        placeholderData: (previousData) => previousData, //로딩 중에도 이전 데이터 유지 (깜빡임 방지)
    });

    // 서버가 일하는 중이거나(isFetching) OR 아직 디바운싱 대기 중이거나(값이 다름)
    const isLoadingIndicator = isFetching || (localSearch !== search);

    // 3. Table Columns
    const columns = useMemo<ColumnDef<Payment>[]>(() => [
        // { accessorKey: 'id', header: 'ID', size: 80 },
        { accessorKey: 'No', header: 'No', size: 80 },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <button className="flex items-center hover:text-blue-500" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Email <ArrowUpDown className="ml-2 h-4 w-4" />
                </button>
            ),
            size: 220,
        },
        { accessorKey: 'amount', header: 'Amount', cell: i => `$${i.getValue()}`, size: 100 },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (info) => {
                const s = info.getValue() as string;
                const style = s === 'success' ? 'bg-green-100 text-green-700' :
                                s === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-700';
                return <span className={cn("px-2 py-1 rounded-full text-xs font-bold", style)}>{s}</span>
            },
            size: 120,
        },
    ], []);

    // 4. Table Instance
    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // 5. Virtual Scroll (가상화)
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 48,
        overscan: 10,
    });

    // 6. Chart Data (Filtered Data 기반)
    const chartData = useMemo(() => {
        const summary: Record<string, number> = {};
        data.forEach(r => { summary[r.status] = (summary[r.status] || 0) + 1 });
        return Object.keys(summary).map(k => ({ name: k, value: summary[k] }));
    }, [data]);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
                    <p className="text-muted-foreground">Next.js Client + Node.js Server</p>
                </div>
                {isFetching && <div className="text-sm text-blue-500 flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Syncing...</div>}
            </div>

            {/* Chart */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-xl p-6 bg-card text-card-foreground shadow-sm bg-white">
                    <div className="text-sm font-medium text-slate-500">Total Results</div>
                    <div className="text-4xl font-bold mt-2">{data.length.toLocaleString()}</div>
                </div>
                <div className="border rounded-xl p-6 bg-white shadow-sm col-span-2 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false}/>
                            <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                            <Bar dataKey="value" fill="#0f172a" radius={[4,4,0,0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Area */}
            <div className="border rounded-xl bg-white shadow-sm flex flex-col h-[600px] overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b flex items-center gap-4 bg-slate-50/50">
                <div className="relative flex-1 max-w-sm">
                    {/* 아이콘 교체 로직: 로딩 중이면 스피너, 아니면 돋보기 */}
                    <div className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 flex items-center justify-center">
                        {isLoadingIndicator ? (
                            <Loader2 className="animate-spin w-4 h-4 text-blue-500" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </div>
                    
                    <input 
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                        placeholder="Search email..."
                        value={localSearch} 
                        onChange={e => setLocalSearch(e.target.value)} 
                    />
                </div>
                    <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-white">
                        <Filter className="w-4 h-4 text-slate-500"/>
                        <select 
                            className="bg-transparent outline-none text-sm"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Virtual Scroll Table */}
                <div ref={tableContainerRef} className="flex-1 overflow-auto relative bg-white">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center gap-2 text-slate-500">
                            <Server className="w-5 h-5 animate-pulse"/> Loading Data from Node.js...
                        </div>
                    ) : (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="w-full relative">
                            <table className="w-full text-sm text-left caption-bottom">
                                <thead className="sticky top-0 z-10 bg-slate-100 h-10 border-b">
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id} className="absolute w-full flex top-0 h-full">
                                            {hg.headers.map(h => (
                                                <th key={h.id} className="flex items-center px-4 font-medium text-slate-500" style={{width: h.getSize()}}>
                                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {rowVirtualizer.getVirtualItems().map(vr => {
                                        const row = rows[vr.index];
                                        return (
                                            <tr key={row.id} className="absolute w-full flex items-center border-b hover:bg-slate-50/80 h-[48px] transition-colors"
                                                style={{transform: `translateY(${vr.start}px)`}}>
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-4" style={{width: cell.column.getSize()}}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="p-3 border-t bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                    <span>{data.length.toLocaleString()} rows fetched</span>
                    <span className="flex items-center gap-1"><Server className="w-3 h-3"/> Node.js API Connected</span>
                </div>
            </div>
        </div>
    );
}