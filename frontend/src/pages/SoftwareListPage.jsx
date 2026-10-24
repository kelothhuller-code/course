import CatalogListPage from './Catalog/CatalogListPage';

export default function SoftwareListPage({ user }) {
  return <CatalogListPage user={user} kind="software" />;
}
