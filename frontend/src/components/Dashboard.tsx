import React, { useEffect, useState } from 'react';
import { getLeads, postEvent } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const industries = ["Technology", "Manufacturing", "Healthcare", "Finance"];

const userId = 'demo-user';

type Lead = {
  id: number;
  name: string;
  company: string;
  industry: string;
  size: number;
  source: string;
  created_at: string;
  quality?: string;
  summary?: string;
};

const Dashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [size, setSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]); // For event log
  const [pendingIndustry, setPendingIndustry] = useState<string>('');
  const [pendingSize, setPendingSize] = useState<number>(0);

  const fetchLeads = async () => {
    setLoading(true);
    const data = await getLeads(industry, size);
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [industry, size]);

  const fetchEvents = async () => {
    const res = await fetch('http://localhost:8000/api/events');
    const data = await res.json();
    setEvents(data);
  };

  const handleApplyFilter = async () => {
    setIndustry(pendingIndustry);
    setSize(pendingSize);
    await postEvent(userId, 'filter', { filterType: 'industry', value: pendingIndustry });
    await postEvent(userId, 'filter', { filterType: 'size', value: pendingSize });
  };

  const handleToggleView = async (v: 'table' | 'chart') => {
    setView(v);
    if (v === 'chart') {
      setChartType('');
    }
    await postEvent(userId, 'toggle_view', { view: v });
  };

  const handleChartType = async (type: 'pie' | 'bar') => {
    setChartType(type);
    await postEvent(userId, 'toggle_view', { view: type });
  };

  const handleRefresh = async () => {
    await postEvent(userId, 'refresh', {});
    fetchLeads();
  };

  // Chart data
  const sourceData = Object.entries(
    leads.reduce((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([source, count]) => ({ name: source, value: count }));

  return (
    <div style={{ padding: 24 }}>
      <h1>Lead Qualifier Dashboard</h1>
      <div style={{ marginBottom: 16 }}>
        <label>Industry: </label>
        <select value={pendingIndustry} onChange={e => setPendingIndustry(e.target.value)}>
          <option value=''>All</option>
          {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <label style={{ marginLeft: 16 }}>Min Size: </label>
        <input type='number' value={pendingSize} min={0} max={500} onChange={e => setPendingSize(Number(e.target.value))} />
        <button style={{ marginLeft: 16 }} onClick={handleApplyFilter}>Apply</button>
        <button style={{ marginLeft: 8 }} onClick={handleRefresh}>Refresh</button>
        <span style={{ marginLeft: 16 }}>
          <label>
            <input type='radio' checked={view === 'table'} onChange={() => handleToggleView('table')} /> Table
          </label>
          <label style={{ marginLeft: 8 }}>
            <input type='radio' checked={view === 'chart'} onChange={() => handleToggleView('chart')} /> Chart
          </label>
        </span>
        {view === 'chart' && (
          <span style={{ marginLeft: 16 }}>
            <label>Chart Type: </label>
            <select value={chartType} onChange={e => handleChartType(e.target.value as 'pie' | 'bar')}>
              <option value=''>Select...</option>
              <option value='pie'>Pie</option>
              <option value='bar'>Bar</option>
            </select>
          </span>
        )}
      </div>
      {loading ? <div>Loading...</div> : (
        view === 'table' ? (
          <>
            <table border={1} cellPadding={6} style={{ width: '100%', marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Size</th>
                  <th>Source</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.company}</td>
                    <td>{lead.industry}</td>
                    <td>{lead.size}</td>
                    <td>{lead.source}</td>
                    <td>{new Date(lead.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* LLM enrichment display */}
            <div style={{ marginTop: 32 }}>
              <h3>LLM Enrichment</h3>
              {leads.map(lead => (
                (lead.quality || lead.summary) ? (
                  <div key={lead.id} style={{ border: '1px solid #ccc', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <strong>{lead.company}</strong> — <em>{lead.name}</em><br/>
                    <span><b>Quality:</b> {lead.quality || 'N/A'}</span><br/>
                    <span><b>Summary:</b> {lead.summary || 'N/A'}</span>
                  </div>
                ) : null
              ))}
            </div>
          </>
        ) : (
          <div style={{ width: 500, margin: '0 auto' }}>
            <h3>Lead Source Distribution</h3>
            {chartType === 'pie' ? (
              <PieChart width={400} height={300}>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {sourceData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : chartType === 'bar' ? (
              <BarChart width={400} height={300} data={sourceData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Please select a chart type.</div>
            )}
          </div>
        )
      )}
      <div style={{ marginTop: 40 }}>
        <h2>Event Log (click button to load)</h2>
        <table border={1} cellPadding={4} style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Action</th>
              <th>Metadata</th>
              <th>Occurred At</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td>{ev.id}</td>
                <td>{ev.user_id}</td>
                <td>{ev.action}</td>
                <td>{JSON.stringify(ev.event_metadata)}</td>
                <td>{ev.occurred_at ? new Date(ev.occurred_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={fetchEvents}>Load Event Log</button>
      </div>
    </div>
  );
};

export default Dashboard; 