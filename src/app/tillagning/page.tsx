import { meta } from '../meta';
import { Page } from '@/components/Page';
import { Cook } from '@/components/Cook';

export const metadata = meta('tillagning/', 'Tillagning · Bulk.', 'Ugnsschema med klockslag och timers för hela batchen, från förberedelse till portionering i lådor.');

export default function TillagningPage() {
  return <Page><Cook /></Page>;
}
