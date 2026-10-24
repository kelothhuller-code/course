import { useParams } from 'react-router-dom';
import CatalogDetailPage from './Catalog/CatalogDetailPage';

export default function SoftwareDetailPage({ user }) {
  const { slug } = useParams();
  return <CatalogDetailPage key={slug} user={user} kind="software" />;
}
