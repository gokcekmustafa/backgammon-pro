import AdminUserDetail from './AdminUserDetail';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() { return <AdminUserDetail />; }
