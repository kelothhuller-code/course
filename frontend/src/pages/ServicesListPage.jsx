import CatalogListPage from './Catalog/CatalogListPage';

export default function ServicesListPage({ user }) {
  return <CatalogListPage user={user} kind="service" />;
}
