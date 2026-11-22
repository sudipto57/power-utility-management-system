import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import { getConnections } from '../../../api/connections';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import SearchBar from '../../../components/common/SearchBar';
import FilterSelect from '../../../components/common/FilterSelect';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import { CONNECTION_STATUSES, CONNECTION_TYPES } from '../../../utils/options';
import { formatDate, formatNumber } from '../../../utils/format';

export default function ConnectionList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useFetch(
    () => getConnections({ search: debouncedSearch, status, type }),
    [debouncedSearch, status, type]
  );

  const columns = [
    {
      key: 'meter_number',
      header: 'Meter',
      render: (co) => (
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Icon name="gauge" className="h-4 w-4" />
          </span>
          <span className="font-mono font-bold text-sand-900">{co.meter_number}</span>
        </span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (co) => (
        <div>
          <p className="font-semibold text-sand-800">{co.customer_name}</p>
          <p className="text-xs text-sand-500">{co.customer_number}</p>
        </div>
      ),
    },
    { key: 'connection_type', header: 'Type' },
    { key: 'installation_date', header: 'Installed', render: (co) => formatDate(co.installation_date) },
    {
      key: 'last_reading',
      header: 'Last reading',
      className: 'text-right',
      render: (co) =>
        co.last_reading !== null ? (
          <div>
            <p className="font-semibold text-sand-800">{formatNumber(co.last_reading)} kWh</p>
            <p className="text-xs text-sand-500">{formatDate(co.last_reading_date)}</p>
          </div>
        ) : (
          <span className="text-sand-500">none</span>
        ),
    },
    { key: 'status', header: 'Status', render: (co) => <StatusBadge status={co.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Connections & meters"
        subtitle="Every electricity service with its meter information."
        actions={
          <Button variant="accent" icon="plus" to="/admin/connections/new">
            New connection
          </Button>
        }
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-sand-100 p-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search meter number or customer..."
            className="min-w-60 flex-1"
          />
          <FilterSelect value={type} onChange={setType} options={CONNECTION_TYPES} allLabel="All types" />
          <FilterSelect value={status} onChange={setStatus} options={CONNECTION_STATUSES} allLabel="All statuses" />
          {data && <span className="text-xs font-semibold text-sand-500">{data.length} found</span>}
        </div>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={loading}
            onRowClick={(co) => navigate(`/admin/connections/${co.id}`)}
            emptyIcon="plug"
            emptyTitle="No connections found"
          />
        )}
      </Card>
    </div>
  );
}
